import { OrderWorkflowService } from '../src/modules/orders/order-workflow.service';

describe('OrderWorkflowService persistence smoke', () => {
  test('createOrder supports STORE_PICKUP minimal contract', async () => {
    const repo: any = {
      tx: (fn: any) => fn({}),
      findStore: async () => ({ id: 's1', isActive: true }),
      findSkus: async () => [
        { id: 'sku1', priceCents: 1200, product: { isPublished: true, supportsPickup: true, supportsShipping: true } }
      ],
      findAvailability: async () => [{ skuId: 'sku1' }],
      createOrder: async (_tx: any, data: any) => ({
        id: 'o1',
        orderNo: data.orderNo,
        status: 'PENDING_PAYMENT',
        totalAmountCents: 2400,
        fulfillmentType: 'STORE_PICKUP',
        pickupRecord: { pickupCode: '123456' }
      }),
      insertOrderStatusLog: async () => ({})
    };

    const service = new OrderWorkflowService(repo);
    const created = await service.createOrder('customer-1', {
      storeId: 's1',
      fulfillmentType: 'STORE_PICKUP',
      pickupDate: new Date().toISOString(),
      pickupTimeSlot: '10:00-12:00',
      items: [{ skuId: 'sku1', quantity: 2 }]
    } as any);

    expect(created.status).toBe('PENDING_PAYMENT');
    expect(created.fulfillmentType).toBe('STORE_PICKUP');
    expect(created.pickupCode).toBeDefined();
  });

  test('createOrder requires shipping address for SHIPPING', async () => {
    const repo: any = {
      tx: (fn: any) => fn({}),
      findStore: async () => ({ id: 's1', isActive: true }),
      findSkus: async () => [
        { id: 'sku1', priceCents: 1200, product: { isPublished: true, supportsPickup: true, supportsShipping: true } }
      ],
      findAvailability: async () => [{ skuId: 'sku1' }]
    };

    const service = new OrderWorkflowService(repo);
    await expect(
      service.createOrder('customer-1', {
        storeId: 's1',
        fulfillmentType: 'SHIPPING',
        items: [{ skuId: 'sku1', quantity: 1 }]
      } as any)
    ).rejects.toThrow('shippingAddress is required for SHIPPING');
  });

  test('markPaid uses durable paymentRef idempotency semantics', async () => {
    const payments = new Map<string, { orderId: string }>();
    const order = {
      id: 'o1',
      storeId: 's1',
      status: 'PENDING_PAYMENT',
      fulfillmentType: 'SHIPPING',
      items: [{ skuId: 'sku-1', quantity: 1 }]
    };

    const repo: any = {
      tx: (fn: any) => fn({}),
      findPaymentByRef: async (_: any, paymentRef: string) => payments.get(paymentRef) ?? null,
      getOrder: async () => order,
      getInventoriesForOrder: async () => [{ id: 'inv-1', skuId: 'sku-1', availableStock: 2, reservedStock: 0, physicalStock: 2 }],
      createPaymentRecord: async (_: any, orderId: string, paymentRef: string) => {
        payments.set(paymentRef, { orderId });
      },
      updateInventory: async () => ({}),
      updateOrderStatus: async () => ({}),
      insertOrderStatusLog: async () => ({}),
      insertInventoryLogs: async () => ({})
    };

    const service = new OrderWorkflowService(repo);

    const first = await service.markPaid('o1', 'p-ref', 100);
    const second = await service.markPaid('o1', 'p-ref', 100);

    expect(first.result).toBe('APPLIED');
    expect(second.result).toBe('IGNORED_DUPLICATE');
  });
});
