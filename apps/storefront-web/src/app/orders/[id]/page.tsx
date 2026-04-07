'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cancelOrder, getOrder, markPaid } from '../../../lib/api';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');

  async function refresh() {
    if (!params?.id) return;
    try {
      const data = await getOrder(params.id);
      setOrder(data);
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    refresh();
  }, [params?.id]);

  return (
    <main>
      <p><Link href="/orders">← Back to orders</Link></p>
      <h1>Order Detail</h1>
      <button onClick={refresh}>Refresh</button>
      <button onClick={() => params?.id && markPaid(params.id, `manual-${Date.now()}`, order?.totalAmountCents ?? 0).then(refresh).catch((e) => setError(e.message))}>Mark Paid</button>
      <button onClick={() => params?.id && cancelOrder(params.id).then(refresh).catch((e) => setError(e.message))}>Cancel</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {order && <pre>{JSON.stringify(order, null, 2)}</pre>}
    </main>
  );
}
