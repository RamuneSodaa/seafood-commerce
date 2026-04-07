'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { storeApi } from '../../../lib/api';

export default function StoreWorkbenchOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function load() {
    storeApi.orders().then(setOrders).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main>
      <p><Link href="/">← Console Home</Link></p>
      <h1>Store Workbench - Orders</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {orders.map((o) => (
        <div key={o.id} style={{ border: '1px solid #ddd', marginBottom: 8, padding: 8 }}>
          <div>{o.orderNo} - {o.status}</div>
          <button onClick={() => storeApi.ready(o.id).then(load).catch((e) => setError(e.message))}>Ready For Pickup</button>
          <button onClick={() => storeApi.completePickup(o.id, o.pickupRecord?.pickupCode || '').then(load).catch((e) => setError(e.message))}>Complete Pickup</button>
          <button onClick={() => storeApi.ship(o.id, 'SF Express', `SF-${Date.now()}`).then(load).catch((e) => setError(e.message))}>Ship</button>
          <button onClick={() => storeApi.deliver(o.id).then(load).catch((e) => setError(e.message))}>Deliver</button>
        </div>
      ))}
    </main>
  );
}
