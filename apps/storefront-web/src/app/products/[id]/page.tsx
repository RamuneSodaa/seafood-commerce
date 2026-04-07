'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProduct } from '../../../lib/api';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) return;
    getProduct(params.id)
      .then((p) => {
        setProduct(p);
        setSelectedSku(p.skus?.[0]?.id || '');
      })
      .catch((e) => setError(e.message));
  }, [params?.id]);

  return (
    <main>
      <p><Link href="/">← Back to list</Link></p>
      <h1>Product Detail</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {product && (
        <div>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <label>
            Select SKU:
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
              {product.skus.map((sku: any) => (
                <option key={sku.id} value={sku.id}>
                  {sku.name} - {sku.priceCents} cents
                </option>
              ))}
            </select>
          </label>
          <div>
            <button onClick={() => router.push(`/checkout?productId=${product.id}&skuId=${selectedSku}`)}>Buy This SKU</button>
          </div>
        </div>
      )}
    </main>
  );
}
