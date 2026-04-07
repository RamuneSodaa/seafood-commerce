import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { code: 'STORE_SH_001' },
    update: {},
    create: {
      code: 'STORE_SH_001',
      name: 'Shanghai Main Store',
      address: 'No.1 Seafood Road',
      contactName: 'Store Lead',
      contactPhone: '13800000000'
    }
  });

  const product = await prisma.product.create({
    data: {
      name: `Fresh Salmon ${Date.now()}`,
      description: 'Phase 1 seed product',
      isPublished: true,
      supportsPickup: true,
      supportsShipping: true,
      skus: {
        create: [
          { code: `SALMON-500G-${Date.now()}`, name: 'Salmon 500g', priceCents: 5800 },
          { code: `SALMON-1KG-${Date.now()}`, name: 'Salmon 1kg', priceCents: 10800 }
        ]
      }
    },
    include: { skus: true }
  });

  for (const sku of product.skus) {
    await prisma.storeSkuAvailability.upsert({
      where: { storeId_skuId: { storeId: store.id, skuId: sku.id } },
      update: { isEnabled: true },
      create: { storeId: store.id, skuId: sku.id, isEnabled: true }
    });

    await prisma.inventory.upsert({
      where: { storeId_skuId: { storeId: store.id, skuId: sku.id } },
      update: {},
      create: {
        storeId: store.id,
        skuId: sku.id,
        physicalStock: 100,
        availableStock: 100,
        reservedStock: 0,
        damagedStock: 0,
        safeStock: 10
      }
    });
  }

  const pickupOrder = await prisma.order.create({
    data: {
      orderNo: `SO-PICKUP-${Date.now()}`,
      customerId: 'seed-customer-1',
      storeId: store.id,
      fulfillmentType: 'STORE_PICKUP',
      status: 'PENDING_PAYMENT',
      totalAmountCents: product.skus[0].priceCents,
      pickupDate: new Date(),
      pickupTimeSlot: '10:00-12:00',
      items: {
        create: [{ skuId: product.skus[0].id, quantity: 1, unitPriceCents: product.skus[0].priceCents }]
      }
    }
  });

  await prisma.pickupRecord.create({
    data: {
      orderId: pickupOrder.id,
      pickupCode: '123456'
    }
  });

  const shippingOrder = await prisma.order.create({
    data: {
      orderNo: `SO-SHIP-${Date.now()}`,
      customerId: 'seed-customer-2',
      storeId: store.id,
      fulfillmentType: 'SHIPPING',
      status: 'PENDING_PAYMENT',
      totalAmountCents: product.skus[1].priceCents,
      items: {
        create: [{ skuId: product.skus[1].id, quantity: 1, unitPriceCents: product.skus[1].priceCents }]
      },
      shippingAddress: {
        create: {
          receiverName: 'Seed User',
          phone: '13900000000',
          province: 'Shanghai',
          city: 'Shanghai',
          district: 'Pudong',
          detail: 'No. 2 Road',
          postalCode: '200000'
        }
      }
    }
  });

  console.log('Seed completed', {
    storeId: store.id,
    productId: product.id,
    pickupOrderId: pickupOrder.id,
    shippingOrderId: shippingOrder.id
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
