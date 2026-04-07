import type { ApiError } from '../../../../packages/shared-types/src/api-client-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

async function request<T>(path: string, role: 'ADMIN' | 'STORE', init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-role': role,
      'x-user-id': role === 'ADMIN' ? 'demo-admin' : 'demo-store',
      ...(init?.headers || {})
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    const err = (await res.json()) as ApiError;
    throw new Error(err.error?.message || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const adminApi = {
  products: () => request<any[]>('/admin/products', 'ADMIN'),
  stores: () => request<any[]>('/admin/stores', 'ADMIN'),
  inventory: () => request<any[]>('/admin/inventory', 'ADMIN')
};

export const storeApi = {
  orders: () => request<any[]>('/orders', 'STORE'),
  ready: (id: string) => request(`/orders/${id}/ready-for-pickup`, 'STORE', { method: 'POST' }),
  completePickup: (id: string, pickupCode: string) =>
    request(`/orders/${id}/complete-pickup`, 'STORE', { method: 'POST', body: JSON.stringify({ pickupCode }) }),
  ship: (id: string, courierCompany: string, trackingNumber: string) =>
    request(`/orders/${id}/ship`, 'STORE', { method: 'POST', body: JSON.stringify({ courierCompany, trackingNumber }) }),
  deliver: (id: string) => request(`/orders/${id}/deliver`, 'STORE', { method: 'POST' })
};
