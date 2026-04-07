'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getOrders } from '../../lib/api';

export default function OrderListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getOrders().then(setOrders).catch((e) => setError(e.message));
  }, []);

  return (
    <main>
      <h1>My Orders</h1>
      <p><Link href="/">← Back to products</Link></p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`}>{o.orderNo}</Link> - {o.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
