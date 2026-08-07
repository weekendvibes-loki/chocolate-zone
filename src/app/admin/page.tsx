'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type Category, type AdminProduct, type AdminOffer } from '@/lib/admin/client';
import { LoadingState } from '@/components/admin/loading';
import { EmptyState } from '@/components/admin/empty-state';
import { useToast } from '@/components/admin/toast';

const LOW_STOCK_THRESHOLD = 10;
const RECENT_COUNT = 5;

function formatRupees(minor: number): string {
  return `₹${(minor / 100).toFixed(2)}`;
}

function formatDiscount(o: AdminOffer): string {
  return o.discount_type === 'percentage' ? `${o.discount_value}% off` : `₹${(o.discount_value / 100).toFixed(2)} off`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatValidity(o: AdminOffer): string {
  if (o.starts_at && o.ends_at) return `${formatDate(o.starts_at)} – ${formatDate(o.ends_at)}`;
  if (o.starts_at) return `From ${formatDate(o.starts_at)}`;
  if (o.ends_at) return `Until ${formatDate(o.ends_at)}`;
  return 'Always on';
}

function stockLabel(stock: number | null): string {
  return stock === null ? 'Unlimited' : `${stock} in stock`;
}

const quickActions = [
  {
    href: '/admin/products',
    label: 'Add product',
    caption: 'Add a menu item',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/categories',
    label: 'Add category',
    caption: 'Organize your menu',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="5" width="6" height="6" rx="1" />
        <rect x="15" y="5" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="15" y="15" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    href: '/admin/offers',
    label: 'Add offer',
    caption: 'Create a promotion',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="m3 3 6.5 6.5M21 3l-6.5 6.5M21 21l-6.5-6.5M3 21l6.5-6.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [catRes, prodRes, offerRes] = await Promise.all([
        adminApi.categories.list(),
        adminApi.products.list(),
        adminApi.offers.list(),
      ]);
      setCategories(catRes.categories);
      setProducts(prodRes.products);
      setOffers(offerRes.offers);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load dashboard.';
      setError(message);
      toast('error', message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? '—',
    [categories],
  );

  const totalVariants = products.reduce((n, p) => n + p.variants.length, 0);
  const activeOffers = offers.filter((o) => o.is_active);

  const lowStock = products
    .filter((p) => p.stock_qty !== null && p.stock_qty <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => (a.stock_qty ?? 0) - (b.stock_qty ?? 0))
    .slice(0, 6);

  const recentProducts = [...products]
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, RECENT_COUNT);

  const stats = [
    { label: 'Total categories', value: categories.length },
    { label: 'Total products', value: products.length },
    { label: 'Product variants', value: totalVariants },
    { label: 'Active offers', value: activeOffers.length },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">An overview of your catalog at a glance.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-all hover:border-zinc-300 hover:shadow-md"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-zinc-900">{action.label}</span>
              <span className="block text-xs text-zinc-500">{action.caption}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[4.75rem] animate-pulse rounded-xl bg-zinc-100" />
            ))
          : stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-4 transition-shadow hover:shadow-md"
              >
                <p className="text-sm text-zinc-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{stat.value}</p>
              </div>
            ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-56 animate-pulse rounded-xl bg-zinc-100" />
            <div className="h-56 animate-pulse rounded-xl bg-zinc-100 lg:col-span-2" />
          </div>
          <LoadingState rows={3} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <section className="rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md">
              <header className="border-b border-zinc-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-zinc-900">Low stock</h2>
              </header>
              <div className="p-4">
                {lowStock.length === 0 ? (
                  <EmptyState
                    title="All stocked up"
                    description="No products are running low right now."
                  />
                ) : (
                  <ul className="space-y-2">
                    {lowStock.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-zinc-900">{p.name}</span>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {p.stock_qty} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md lg:col-span-2">
              <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-zinc-900">Recent products</h2>
                <Link
                  href="/admin/products"
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  View all
                </Link>
              </header>
              <div className="p-4">
                {recentProducts.length === 0 ? (
                  <EmptyState
                    title="No products yet"
                    description="Add your first product to start building your menu."
                  />
                ) : (
                  <ul className="space-y-2">
                    {recentProducts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2"
                      >
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="size-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-300">
                            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <circle cx="9" cy="10" r="1.5" />
                              <path d="m5 18 5-5 3 3 2-2 4 4" />
                            </svg>
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                          <p className="truncate text-xs text-zinc-500">{categoryName(p.category_id)}</p>
                        </div>
                        <span className="hidden shrink-0 text-sm font-medium text-zinc-700 sm:block">
                          {formatRupees(p.base_price)}
                        </span>
                        <span className="hidden shrink-0 text-xs text-zinc-500 md:block">
                          {stockLabel(p.stock_qty)}
                        </span>
                        <Link
                          href="/admin/products"
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        >
                          Edit
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md">
            <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-900">Active offers</h2>
              <Link
                href="/admin/offers"
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
              >
                View all
              </Link>
            </header>
            <div className="p-4">
              {activeOffers.length === 0 ? (
                <EmptyState
                  title="No active offers"
                  description="Create an offer to start driving sales."
                />
              ) : (
                <ul className="grid gap-2 md:grid-cols-2">
                  {activeOffers.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{o.title}</p>
                        <p className="text-xs text-zinc-500">{formatValidity(o)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium text-zinc-700">{formatDiscount(o)}</span>
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
