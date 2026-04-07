import type { ApiError, CreateOrderRequest, CreateOrderResponse } from '../../../../packages/shared-types/src/api-client-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-role': 'CUSTOMER',
      'x-user-id': 'demo-customer',
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

export function getProducts() {
  return request<Array<{ id: string; name: string; description?: string; skus: Array<{ id: string; name: string; priceCents: number }> }>>('/products');
}

export function getProduct(id: string) {
  return request<{ id: string; name: string; description?: string; skus: Array<{ id: string; name: string; priceCents: number }> }>(`/products/${id}`);
}

export function getOrders() {
  return request<any[]>('/orders');
}

export function createOrder(payload: CreateOrderRequest) {
  return request<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getStores() {
  return request<Array<{ id: string; name: string; address: string }>>('/stores');
}

export function getOrder(id: string) {
  return request<any>(`/orders/${id}`);
}

export function markPaid(id: string, paymentRef: string, paidAmountCents: number) {
  return request<{ result: string }>(`/orders/${id}/mark-paid`, {
    method: 'POST',
    body: JSON.stringify({ paymentRef, paidAmountCents })
  });
}

export function cancelOrder(id: string) {
  return request<{ result: string }>(`/orders/${id}/cancel`, {
    method: 'POST'
  });
}
