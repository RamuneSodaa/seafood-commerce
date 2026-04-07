'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';

export default function AdminInventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.inventory().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <main>
      <p><Link href="/">← Console Home</Link></p>
      <h1>Admin Inventory</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
