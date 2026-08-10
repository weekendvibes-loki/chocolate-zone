'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi, type Category, type AdminProduct, type AdminOffer } from '@/lib/admin/client';
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
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/admin/categories',
    label: 'Add category',
    caption: 'Organize your menu',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/admin/offers',
    label: 'Add offer',
    caption: 'Create a promotion',
    icon: (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" strokeLinejoin="round" />
        <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

function StatIcon({ type }: { type: 'categories' | 'products' | 'variants' | 'offers' }) {
  const common = {
    className: 'size-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    'aria-hidden': true as const,
  };
  switch (type) {
    case 'categories':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'products':
      return (
        <svg {...common}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" strokeLinejoin="round" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
    case 'variants':
      return (
        <svg {...common}>
          <path d="m12 2 9 5-9 5-9-5 9-5Z" strokeLinejoin="round" />
          <path d="m3 12 9 5 9-5M3 17l9 5 9-5" strokeLinejoin="round" />
        </svg>
      );
    case 'offers':
      return (
        <svg {...common}>
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" strokeLinejoin="round" />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      );
  }
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
    { label: 'Categories', value: categories.length, type: 'categories' as const },
    { label: 'Products', value: products.length, type: 'products' as const },
    { label: 'Variants', value: totalVariants, type: 'variants' as const },
    { label: 'Active offers', value: activeOffers.length, type: 'offers' as const },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Overview</span>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-base">
          Here&apos;s what&apos;s happening across your shop today.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 transition-colors group-hover:bg-amber-400 group-hover:text-zinc-900">
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-zinc-900">{action.label}</span>
              <span className="block text-xs text-zinc-500">{action.caption}</span>
            </span>
            <svg
              className="size-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            ))
          : stats.map((stat) => (
              <div
                key={stat.label}
                className="group rounded-2xl border border-zinc-200 bg-white px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700 transition-colors group-hover:bg-amber-400 group-hover:text-zinc-900">
                  <StatIcon type={stat.type} />
                </span>
                <p className="mt-3 font-serif text-3xl font-semibold text-zinc-900">{stat.value}</p>
                <p className="mt-0.5 text-sm text-zinc-500">{stat.label}</p>
              </div>
            ))}
      </div>

      {loading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-2" />
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-100 lg:col-span-3" />
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <header className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 9v4m0 4h.01" strokeLinecap="round" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" strokeLinejoin="round" />
                  </svg>
                </span>
                <h2 className="font-serif text-base font-semibold text-zinc-900">Low stock</h2>
              </header>
              <div className="p-4">
                {lowStock.length === 0 ? (
                  <SectionEmpty
                    title="All stocked up"
                    description="No products are running low right now."
                  />
                ) : (
                  <ul className="space-y-2">
                    {lowStock.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-zinc-900">{p.name}</span>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          {p.stock_qty} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
              <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" strokeLinejoin="round" />
                      <path d="M3 8l9 5 9-5M12 13v8" />
                    </svg>
                  </span>
                  <h2 className="font-serif text-base font-semibold text-zinc-900">Recent products</h2>
                </div>
                <Link
                  href="/admin/products"
                  className="text-xs font-semibold text-amber-700 transition-colors hover:text-amber-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  View all
                </Link>
              </header>
              <div className="p-4">
                {recentProducts.length === 0 ? (
                  <SectionEmpty
                    title="No products yet"
                    description="Add your first product to start building your menu."
                  />
                ) : (
                  <ul className="space-y-2">
                    {recentProducts.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5"
                      >
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="size-10 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f5ede1] text-zinc-300">
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
                        <span className="hidden shrink-0 text-sm font-semibold text-zinc-700 sm:block">
                          {formatRupees(p.base_price)}
                        </span>
                        <span className="hidden shrink-0 text-xs text-zinc-500 md:block">
                          {stockLabel(p.stock_qty)}
                        </span>
                        <Link
                          href="/admin/products"
                          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-amber-50 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-700">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" strokeLinejoin="round" />
                    <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
                  </svg>
                </span>
                <h2 className="font-serif text-base font-semibold text-zinc-900">Active offers</h2>
              </div>
              <Link
                href="/admin/offers"
                className="text-xs font-semibold text-amber-700 transition-colors hover:text-amber-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                View all
              </Link>
            </header>
            <div className="p-4">
              {activeOffers.length === 0 ? (
                <SectionEmpty
                  title="No active offers"
                  description="Create an offer to start driving sales."
                />
              ) : (
                <ul className="grid gap-2 md:grid-cols-2">
                  {activeOffers.map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-white px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">{o.title}</p>
                        <p className="text-xs text-zinc-500">{formatValidity(o)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-700">{formatDiscount(o)}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
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

function SectionEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-[#fbf7f0] px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">{description}</p>
    </div>
  );
}
