import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrderRepository } from './order.repository';
import { CreateOrderDto } from './dto/order-workflow.dto';

@Injectable()
export class OrderWorkflowService {
  constructor(private readonly repo: OrderRepository) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    return this.repo.tx(async (tx) => {
      const store = await this.repo.findStore(tx, dto.storeId);
      if (!store || !store.isActive) throw new BadRequestException('Store not available');

      const skuIds = dto.items.map((i) => i.skuId);
      const skus = await this.repo.findSkus(tx, skuIds);
      if (skus.length !== skuIds.length) throw new BadRequestException('Some SKUs are invalid');

      const availability = await this.repo.findAvailability(tx, dto.storeId, skuIds);
      if (availability.length !== skuIds.length) throw new BadRequestException('Some SKUs are not available in selected store');

      const skuMap = new Map(skus.map((s) => [s.id, s]));
      let totalAmountCents = 0;
      for (const item of dto.items) {
        const sku = skuMap.get(item.skuId)!;
        if (!sku.product.isPublished) throw new BadRequestException('Product is not published');
        if (dto.fulfillmentType === 'STORE_PICKUP' && !sku.product.supportsPickup) {
          throw new BadRequestException('SKU does not support pickup');
        }
        if (dto.fulfillmentType === 'SHIPPING' && !sku.product.supportsShipping) {
          throw new BadRequestException('SKU does not support shipping');
        }
        totalAmountCents += sku.priceCents * item.quantity;
      }

      if (dto.fulfillmentType === 'STORE_PICKUP' && (!dto.pickupDate || !dto.pickupTimeSlot)) {
        throw new BadRequestException('pickupDate and pickupTimeSlot are required for STORE_PICKUP');
      }

      if (dto.fulfillmentType === 'SHIPPING' && !dto.shippingAddress) {
        throw new BadRequestException('shippingAddress is required for SHIPPING');
      }

      const now = Date.now();
      const orderNo = `SO-${now}`;
      const pickupCode = Math.floor(100000 + Math.random() * 900000).toString();

      const order = await this.repo.createOrder(tx, {
        orderNo,
        customerId,
        store: { connect: { id: dto.storeId } },
        fulfillmentType: dto.fulfillmentType,
        status: OrderStatus.PENDING_PAYMENT,
        totalAmountCents,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
        pickupTimeSlot: dto.pickupTimeSlot,
        items: {
          create: dto.items.map((item) => ({
            sku: { connect: { id: item.skuId } },
            quantity: item.quantity,
            unitPriceCents: skuMap.get(item.skuId)!.priceCents
          }))
        },
        shippingAddress:
          dto.fulfillmentType === 'SHIPPING' && dto.shippingAddress
            ? {
                create: {
                  receiverName: dto.shippingAddress.receiverName,
                  phone: dto.shippingAddress.phone,
                  province: dto.shippingAddress.province,
                  city: dto.shippingAddress.city,
                  district: dto.shippingAddress.district,
                  detail: dto.shippingAddress.detail,
                  postalCode: dto.shippingAddress.postalCode
                }
              }
            : undefined,
        pickupRecord:
          dto.fulfillmentType === 'STORE_PICKUP'
            ? {
                create: {
                  pickupCode
                }
              }
            : undefined
      });

      await this.repo.insertOrderStatusLog(tx, order.id, null, OrderStatus.PENDING_PAYMENT, 'order created');

      return {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        totalAmountCents: order.totalAmountCents,
        fulfillmentType: order.fulfillmentType,
        pickupCode: order.pickupRecord?.pickupCode
      };
    });
  }

  async markPaid(orderId: string, paymentRef: string, paidAmountCents: number) {
    return this.repo.tx(async (tx) => {
      const existingPayment = await this.repo.findPaymentByRef(tx, paymentRef);
      if (existingPayment) {
        if (existingPayment.orderId !== orderId) {
          throw new BadRequestException('Duplicate paymentRef used for a different order');
        }
        return { result: 'IGNORED_DUPLICATE' as const };
      }

      const order = await this.repo.getOrder(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'PENDING_PAYMENT') {
        throw new BadRequestException('Invalid transition: payment only allowed from PENDING_PAYMENT');
      }

      const skuIds = order.items.map((i) => i.skuId);
      const inventories = await this.repo.getInventoriesForOrder(tx, order.storeId, skuIds);
      const bySku = new Map(inventories.map((i) => [i.skuId, i]));

      for (const item of order.items) {
        const inv = bySku.get(item.skuId);
        if (!inv) throw new BadRequestException(`Inventory missing for sku ${item.skuId}`);
        if (inv.availableStock < item.quantity) throw new BadRequestException('Insufficient available stock');
      }

      await this.repo.createPaymentRecord(tx, orderId, paymentRef, paidAmountCents);

      const inventoryLogs = [] as {
        inventoryId: string;
        orderId: string;
        action: string;
        deltaAvailable: number;
        deltaReserved: number;
        deltaPhysical: number;
      }[];

      for (const item of order.items) {
        const inv = bySku.get(item.skuId)!;
        await this.repo.updateInventory(tx, inv.id, {
          availableStock: inv.availableStock - item.quantity,
          reservedStock: inv.reservedStock + item.quantity
        });
        inventoryLogs.push({
          inventoryId: inv.id,
          orderId,
          action: 'RESERVE_AFTER_PAYMENT',
          deltaAvailable: -item.quantity,
          deltaReserved: item.quantity,
          deltaPhysical: 0
        });
      }

      const toStatus = order.fulfillmentType === 'STORE_PICKUP' ? OrderStatus.PAID_PENDING_PREP : OrderStatus.PAID_PENDING_SHIPMENT;
      await this.repo.updateOrderStatus(tx, orderId, toStatus);
      await this.repo.insertOrderStatusLog(tx, orderId, order.status as OrderStatus, toStatus, `payment marked: ${paymentRef}`);
      await this.repo.insertInventoryLogs(tx, inventoryLogs);

      return { result: 'APPLIED' as const };
    });
  }

  async cancelOrder(orderId: string) {
    return this.repo.tx(async (tx) => {
      const order = await this.repo.getOrder(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');

      const cancellable: OrderStatus[] = [
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAID_PENDING_PREP,
        OrderStatus.PAID_PENDING_SHIPMENT,
        OrderStatus.READY_FOR_PICKUP
      ];
      if (!cancellable.includes(order.status)) throw new BadRequestException('Invalid transition: order cannot be cancelled');

      const skuIds = order.items.map((i) => i.skuId);
      const inventories = await this.repo.getInventoriesForOrder(tx, order.storeId, skuIds);
      const bySku = new Map(inventories.map((i) => [i.skuId, i]));

      const shouldRollback = order.status !== OrderStatus.PENDING_PAYMENT;
      if (shouldRollback) {
        for (const item of order.items) {
          const inv = bySku.get(item.skuId);
          if (!inv) throw new BadRequestException(`Inventory missing for sku ${item.skuId}`);
          if (inv.reservedStock < item.quantity) throw new BadRequestException('Reserved stock underflow');
        }
      }

      const logs = [] as {
        inventoryId: string;
        orderId: string;
        action: string;
        deltaAvailable: number;
        deltaReserved: number;
        deltaPhysical: number;
      }[];

      if (shouldRollback) {
        for (const item of order.items) {
          const inv = bySku.get(item.skuId)!;
          await this.repo.updateInventory(tx, inv.id, {
            availableStock: inv.availableStock + item.quantity,
            reservedStock: inv.reservedStock - item.quantity
          });
          logs.push({
            inventoryId: inv.id,
            orderId,
            action: 'ROLLBACK_ON_CANCEL',
            deltaAvailable: item.quantity,
            deltaReserved: -item.quantity,
            deltaPhysical: 0
          });
        }
      }

      await this.repo.updateOrderStatus(tx, orderId, OrderStatus.CANCELLED);
      await this.repo.insertOrderStatusLog(tx, orderId, order.status as OrderStatus, OrderStatus.CANCELLED, 'cancelled by user/admin');
      await this.repo.insertInventoryLogs(tx, logs);
      return { result: 'CANCELLED' as const };
    });
  }

  async markReadyForPickup(orderId: string) {
    return this.repo.tx(async (tx) => {
      const order = await this.repo.getOrder(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (order.fulfillmentType !== 'STORE_PICKUP' || order.status !== OrderStatus.PAID_PENDING_PREP) {
        throw new BadRequestException('Invalid transition: ready for pickup');
      }

      await this.repo.updateOrderStatus(tx, orderId, OrderStatus.READY_FOR_PICKUP);
      await this.repo.insertOrderStatusLog(tx, orderId, order.status as OrderStatus, OrderStatus.READY_FOR_PICKUP, 'store prepared');
      return { result: 'READY_FOR_PICKUP' as const };
    });
  }

  async completePickup(orderId: string, pickupCode: string) {
    return this.repo.tx(async (tx) => {
      const order = await this.repo.getOrder(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (order.fulfillmentType !== 'STORE_PICKUP' || order.status !== OrderStatus.READY_FOR_PICKUP) {
        throw new BadRequestException('Invalid transition: complete pickup');
      }

      const pickupRecord = await tx.pickupRecord.findUnique({ where: { orderId } });
      if (!pickupRecord || pickupRecord.pickupCode !== pickupCode) {
        throw new BadRequestException('Invalid pickup code');
      }
      if (pickupRecord.pickedUpAt) {
        throw new BadRequestException('Pickup already completed');
      }

      const skuIds = order.items.map((i) => i.skuId);
      const inventories = await this.repo.getInventoriesForOrder(tx, order.storeId, skuIds);
      const bySku = new Map(inventories.map((i) => [i.skuId, i]));

      for (const item of order.items) {
        const inv = bySku.get(item.skuId);
        if (!inv) throw new BadRequestException(`Inventory missing for sku ${item.skuId}`);
        if (inv.reservedStock < item.quantity || inv.physicalStock < item.quantity) {
          throw new BadRequestException('Stock underflow on pickup');
        }
      }

      const logs = [] as {
        inventoryId: string;
        orderId: string;
        action: string;
        deltaAvailable: number;
        deltaReserved: number;
        deltaPhysical: number;
      }[];

      for (const item of order.items) {
        const inv = bySku.get(item.skuId)!;
        await this.repo.updateInventory(tx, inv.id, {
          reservedStock: inv.reservedStock - item.quantity,
          physicalStock: inv.physicalStock - item.quantity
        });

        logs.push({
          inventoryId: inv.id,
          orderId,
          action: 'DEDUCT_ON_PICKUP_COMPLETE',
          deltaAvailable: 0,
          deltaReserved: -item.quantity,
          deltaPhysical: -item.quantity
        });
      }

      await tx.pickupRecord.update({ where: { orderId }, data: { pickedUpAt: new Date() } });
      await this.repo.updateOrderStatus(tx, orderId, OrderStatus.COMPLETED);
      await this.repo.insertOrderStatusLog(tx, orderId, order.status as OrderStatus, OrderStatus.COMPLETED, 'pickup completed');
      await this.repo.insertInventoryLogs(tx, logs);
      return { result: 'COMPLETED' as const };
    });
  }

  async shipOrder(orderId: string, courierCompany: string, trackingNumber: string) {
    return this.repo.tx(async (tx) => {
      const order = await this.repo.getOrder(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (order.fulfillmentType !== 'SHIPPING' || order.status !== OrderStatus.PAID_PENDING_SHIPMENT) {
        throw new BadRequestException('Invalid transition: ship order');
      }

      const skuIds = order.items.map((i) => i.skuId);
      const inventories = await this.repo.getInventoriesForOrder(tx, order.storeId, skuIds);
      const bySku = new Map(inventories.map((i) => [i.skuId, i]));

      for (const item of order.items) {
        const inv = bySku.get(item.skuId);
        if (!inv) throw new BadRequestException(`Inventory missing for sku ${item.skuId}`);
        if (inv.reservedStock < item.quantity || inv.physicalStock < item.quantity) {
          throw new BadRequestException('Stock underflow on shipment');
        }
      }

      const logs = [] as {
        inventoryId: string;
        orderId: string;
        action: string;
        deltaAvailable: number;
        deltaReserved: number;
        deltaPhysical: number;
      }[];

      for (const item of order.items) {
        const inv = bySku.get(item.skuId)!;
        await this.repo.updateInventory(tx, inv.id, {
          reservedStock: inv.reservedStock - item.quantity,
          physicalStock: inv.physicalStock - item.quantity
        });

        logs.push({
          inventoryId: inv.id,
          orderId,
          action: 'DEDUCT_ON_SHIPPED',
          deltaAvailable: 0,
          deltaReserved: -item.quantity,
          deltaPhysical: -item.quantity
        });
      }

      await this.repo.createShipment(tx, orderId, courierCompany, trackingNumber);
      await this.repo.updateOrderStatus(tx, orderId, OrderStatus.SHIPPED);
      await this.repo.insertOrderStatusLog(tx, orderId, order.status as OrderStatus, OrderStatus.SHIPPED, 'shipment created and shipped');
      await this.repo.insertInventoryLogs(tx, logs);
      return { result: 'SHIPPED' as const };
    });
  }

  async markDelivered(orderId: string) {
    return this.repo.tx(async (tx) => {
      const order = await this.repo.getOrder(tx, orderId);
      if (!order) throw new NotFoundException('Order not found');
      if (order.fulfillmentType !== 'SHIPPING' || order.status !== OrderStatus.SHIPPED) {
        throw new BadRequestException('Invalid transition: deliver order');
      }

      await this.repo.markDelivered(tx, orderId);
      await this.repo.updateOrderStatus(tx, orderId, OrderStatus.DELIVERED);
      await this.repo.insertOrderStatusLog(tx, orderId, order.status as OrderStatus, OrderStatus.DELIVERED, 'shipping delivered');
      return { result: 'DELIVERED' as const };
    });
  }

  async getOrder(orderId: string) {
    const order = await this.repo.getOrderDetail(orderId);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async listOrders() {
    return this.repo.listOrders();
  }

  async getOrderStatusLogs(orderId: string) {
    return this.repo.getStatusLogs(orderId);
  }
}
