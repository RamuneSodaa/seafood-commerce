import { Injectable } from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx));
  }

  async createPaymentRecord(tx: Prisma.TransactionClient, orderId: string, paymentRef: string, paidAmountCents: number) {
    return tx.paymentRecord.create({
      data: { orderId, paymentRef, paidAmountCents }
    });
  }

  async findPaymentByRef(tx: Prisma.TransactionClient, paymentRef: string) {
    return tx.paymentRecord.findUnique({ where: { paymentRef } });
  }

  async findStore(tx: Prisma.TransactionClient, storeId: string) {
    return tx.store.findUnique({ where: { id: storeId } });
  }

  async findSkus(tx: Prisma.TransactionClient, skuIds: string[]) {
    return tx.sku.findMany({
      where: { id: { in: skuIds } },
      include: { product: true }
    });
  }

  async findAvailability(tx: Prisma.TransactionClient, storeId: string, skuIds: string[]) {
    return tx.storeSkuAvailability.findMany({
      where: {
        storeId,
        skuId: { in: skuIds },
        isEnabled: true
      }
    });
  }

  async createOrder(tx: Prisma.TransactionClient, data: Prisma.OrderCreateInput) {
    return tx.order.create({
      data,
      include: { items: true, shippingAddress: true, pickupRecord: true }
    });
  }

  async getOrder(tx: Prisma.TransactionClient, orderId: string) {
    return tx.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
  }

  async listOrders() {
    return this.prisma.order.findMany({
      include: { items: true, shipment: true, pickupRecord: true, shippingAddress: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getOrderDetail(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, shipment: true, pickupRecord: true, shippingAddress: true, statusLogs: true }
    });
  }

  async getStatusLogs(orderId: string) {
    return this.prisma.orderStatusLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getInventoriesForOrder(tx: Prisma.TransactionClient, storeId: string, skuIds: string[]) {
    return tx.inventory.findMany({
      where: { storeId, skuId: { in: skuIds } }
    });
  }

  async updateInventory(tx: Prisma.TransactionClient, inventoryId: string, data: Prisma.InventoryUpdateInput) {
    return tx.inventory.update({ where: { id: inventoryId }, data });
  }

  async insertInventoryLogs(tx: Prisma.TransactionClient, data: Prisma.InventoryLogCreateManyInput[]) {
    if (data.length === 0) return;
    await tx.inventoryLog.createMany({ data });
  }

  async insertOrderStatusLog(
    tx: Prisma.TransactionClient,
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    reason?: string
  ) {
    await tx.orderStatusLog.create({
      data: { orderId, fromStatus, toStatus, reason }
    });
  }

  async updateOrderStatus(tx: Prisma.TransactionClient, orderId: string, status: OrderStatus) {
    return tx.order.update({ where: { id: orderId }, data: { status } });
  }

  async createShipment(tx: Prisma.TransactionClient, orderId: string, courierCompany: string, trackingNumber: string) {
    return tx.shipment.upsert({
      where: { orderId },
      update: { courierCompany, trackingNumber, shippedAt: new Date() },
      create: { orderId, courierCompany, trackingNumber, shippedAt: new Date() }
    });
  }

  async markDelivered(tx: Prisma.TransactionClient, orderId: string) {
    return tx.shipment.update({
      where: { orderId },
      data: { deliveredAt: new Date() }
    });
  }
}
