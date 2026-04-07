'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProducts } from '../lib/api';

export default function ProductListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch((e) => setError(e.message));
  }, []);

  return (
    <main>
      <h1>Storefront - Products</h1>
      <p>
        <Link href="/orders">My Orders</Link>
      </p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`}>{p.name}</Link>
            <div>{p.description}</div>
            <small>{p.skus?.length || 0} SKUs</small>
          </li>
        ))}
      </ul>
    </main>
  );
}
