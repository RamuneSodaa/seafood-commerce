'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { createOrder, getStores, getProduct } from '../../lib/api';

export default function CheckoutPage() {
  const query = useSearchParams();
  const router = useRouter();
  const productId = query.get('productId') || '';
  const presetSkuId = query.get('skuId') || '';

  const [product, setProduct] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState('');
  const [skuId, setSkuId] = useState(presetSkuId);
  const [qty, setQty] = useState(1);
  const [fulfillmentType, setFulfillmentType] = useState<'STORE_PICKUP' | 'SHIPPING'>('STORE_PICKUP');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStores().then((s) => {
      setStores(s);
      setStoreId(s[0]?.id || '');
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!productId) return;
    getProduct(productId)
      .then((p) => {
        setProduct(p);
        setSkuId((current) => current || p.skus?.[0]?.id || '');
      })
      .catch((e) => setError(e.message));
  }, [productId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!storeId || !skuId) {
      setError('Please select store and sku');
      return;
    }

    try {
      const payload: any = {
        storeId,
        fulfillmentType,
        items: [{ skuId, quantity: qty }]
      };

      if (fulfillmentType === 'STORE_PICKUP') {
        payload.pickupDate = new Date().toISOString();
        payload.pickupTimeSlot = '10:00-12:00';
      } else {
        payload.shippingAddress = {
          receiverName: 'Demo User',
          phone: '13000000000',
          province: 'Shanghai',
          city: 'Shanghai',
          district: 'Pudong',
          detail: 'Road 1'
        };
      }

      const created = await createOrder(payload);
      setResult(created);
      router.push(`/orders/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main>
      <p><Link href="/">← Back to products</Link></p>
      <h1>Checkout</h1>
      {product && <p>Product: {product.name}</p>}

      <form onSubmit={submit}>
        <label>
          Store:
          <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        <label>
          SKU:
          <select value={skuId} onChange={(e) => setSkuId(e.target.value)}>
            {(product?.skus || []).map((s: any) => <option key={s.id} value={s.id}>{s.name} - {s.priceCents}</option>)}
          </select>
        </label>

        <label>
          Quantity:
          <input type="number" value={qty} min={1} onChange={(e) => setQty(Number(e.target.value))} />
        </label>

        <label>
          Fulfillment:
          <select value={fulfillmentType} onChange={(e) => setFulfillmentType(e.target.value as any)}>
            <option value="STORE_PICKUP">STORE_PICKUP</option>
            <option value="SHIPPING">SHIPPING</option>
          </select>
        </label>

        <button type="submit">Create Order</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </main>
  );
}
