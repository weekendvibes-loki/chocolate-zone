import type { Category, ShopSettings } from '@/types/domain';
import type { AdminProduct, AdminVariant } from '@/lib/services/adminProducts';
import type { AdminOffer } from '@/lib/services/offers';
import type { ApiEnvelope } from '@/types/domain';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || 'error' in body) {
    const err = !body || 'error' in body ? (body as { error?: { code: string; message: string; details?: unknown } })?.error : undefined;
    throw new ApiClientError(
      err?.message ?? 'Something went wrong. Please try again.',
      err?.code ?? 'INTERNAL_ERROR',
      res.status,
      err?.details,
    );
  }
  return (body as { data: T }).data;
}

export const adminApi = {
  categories: {
    list: () => request<{ categories: Category[] }>('/api/admin/categories'),
    create: (body: unknown) => request<{ category: Category }>('/api/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) => request<{ category: Category }>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: true }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  },
  products: {
    list: (query?: string) => request<{ products: AdminProduct[] }>(`/api/admin/products${query ?? ''}`),
    create: (body: unknown) => request<{ product: AdminProduct }>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) => request<{ product: AdminProduct }>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => request<{ product: AdminProduct }>(`/api/admin/products/${id}`, { method: 'DELETE' }),
  },
  offers: {
    list: () => request<{ offers: AdminOffer[] }>('/api/admin/offers'),
    create: (body: unknown) => request<{ offer: AdminOffer }>('/api/admin/offers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: unknown) => request<{ offer: AdminOffer }>(`/api/admin/offers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => request<{ ok: true }>(`/api/admin/offers/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => request<{ settings: ShopSettings }>('/api/admin/settings'),
    update: (body: unknown) => request<{ settings: ShopSettings }>('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  upload: {
    signed: (body: { bucket: 'product-images' | 'offer-images'; fileName: string; contentType: string; sizeBytes: number }) =>
      request<SignedUpload>('/api/admin/upload', { method: 'POST', body: JSON.stringify(body) }),
  },
};

export interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  bucket: 'product-images' | 'offer-images';
}

export type { AdminProduct, AdminVariant, AdminOffer, Category, ShopSettings };
