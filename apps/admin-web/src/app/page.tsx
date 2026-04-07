import Link from 'next/link';

export default function AdminHome() {
  return (
    <main>
      <h1>Admin / Store Console</h1>
      <ul>
        <li><Link href="/products">Products</Link></li>
        <li><Link href="/stores">Stores</Link></li>
        <li><Link href="/inventory">Inventory</Link></li>
        <li><Link href="/workbench/orders">Store Workbench</Link></li>
      </ul>
    </main>
  );
}
