import { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../src/modules/orders/order.repository';
import { OrderWorkflowService } from '../src/modules/orders/order-workflow.service';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('OrderWorkflowService PostgreSQL integration', () => {
  const prisma = new PrismaClient();
  const repo = new OrderRepository(prisma as any);
  const service = new OrderWorkflowService(repo);

  let storeId = '';
  let skuId = '';
  let orderId = '';

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { code: `INT-STORE-${Date.now()}`, name: 'Integration Store', address: 'Address' }
    });
    storeId = store.id;

    const product = await prisma.product.create({
      data: {
        name: 'Integration Product',
        isPublished: true,
        supportsPickup: true,
        supportsShipping: true,
        skus: { create: [{ code: `INT-SKU-${Date.now()}`, name: 'SKU', priceCents: 1000 }] }
      },
      include: { skus: true }
    });
    skuId = product.skus[0].id;

    await prisma.storeSkuAvailability.create({ data: { storeId, skuId, isEnabled: true } });

    await prisma.inventory.create({
      data: {
        storeId,
        skuId,
        physicalStock: 10,
        availableStock: 10,
        reservedStock: 0,
        safeStock: 0,
        damagedStock: 0
      }
    });

    const order = await prisma.order.create({
      data: {
        orderNo: `INT-ORDER-${Date.now()}`,
        customerId: 'int-customer',
        storeId,
        fulfillmentType: 'SHIPPING',
        status: 'PENDING_PAYMENT',
        totalAmountCents: 1000,
        items: { create: [{ skuId, quantity: 2, unitPriceCents: 1000 }] },
        shippingAddress: {
          create: {
            receiverName: 'Int User',
            phone: '13000000000',
            province: 'P',
            city: 'C',
            district: 'D',
            detail: 'Street 1'
          }
        }
      }
    });
    orderId = order.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('createOrder persists SHIPPING snapshot payload', async () => {
    const created = await service.createOrder('int-customer-2', {
      storeId,
      fulfillmentType: 'SHIPPING',
      items: [{ skuId, quantity: 1 }],
      shippingAddress: {
        receiverName: 'Alice',
        phone: '13100000000',
        province: 'P',
        city: 'C',
        district: 'D',
        detail: 'Road 1'
      }
    } as any);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.id },
      include: { shippingAddress: true }
    });

    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.shippingAddress?.receiverName).toBe('Alice');
  });

  test('paymentRef idempotency is persistence-backed', async () => {
    const first = await service.markPaid(orderId, 'int-pay-ref-1', 1000);
    const second = await service.markPaid(orderId, 'int-pay-ref-1', 1000);

    expect(first.result).toBe('APPLIED');
    expect(second.result).toBe('IGNORED_DUPLICATE');

    const inv = await prisma.inventory.findUniqueOrThrow({ where: { storeId_skuId: { storeId, skuId } } });
    expect(inv.availableStock).toBe(8);
    expect(inv.reservedStock).toBe(2);
  });

  test('cancel rollback restores availability', async () => {
    const created = await service.createOrder('int-customer-3', {
      storeId,
      fulfillmentType: 'SHIPPING',
      items: [{ skuId, quantity: 1 }],
      shippingAddress: {
        receiverName: 'Bob',
        phone: '13200000000',
        province: 'P',
        city: 'C',
        district: 'D',
        detail: 'Road 2'
      }
    } as any);

    await service.markPaid(created.id, `pay-cancel-${Date.now()}`, 1000);
    await service.cancelOrder(created.id);

    const cancelled = await prisma.order.findUniqueOrThrow({ where: { id: created.id } });
    expect(cancelled.status).toBe('CANCELLED');
  });
});
