'use client';

import { useMemo, useState } from 'react';
import { SearchBox } from '@/components/admin/search-box';
import { EmptyState } from '@/components/admin/empty-state';
import { ProductCard } from '@/components/storefront/product-card';
import { toMinor } from '@/lib/pricing/money';
import type { Catalog } from '@/types/domain';

type SortKey = 'default' | 'name' | 'price-asc' | 'price-desc';

export function ProductCatalog({
  catalog,
  initialCategory,
}: {
  catalog: Catalog;
  initialCategory?: string;
}) {
  const offersById = useMemo(() => new Map(catalog.offers.map((o) => [o.id, o])), [catalog.offers]);
  const currency = catalog.shop.currency;

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>(
    initialCategory && catalog.categories.some((c) => c.id === initialCategory) ? initialCategory : 'all',
  );
  const [sort, setSort] = useState<SortKey>('default');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = catalog.products;
    if (categoryId !== 'all') filtered = filtered.filter((p) => p.category_id === categoryId);
    if (q) filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));

    const result = [...filtered];
    switch (sort) {
      case 'name':
        return result.sort((a, b) => a.name.localeCompare(b.name));
      case 'price-asc':
        return result.sort((a, b) => toMinor(a.base_price) - toMinor(b.base_price));
      case 'price-desc':
        return result.sort((a, b) => toMinor(b.base_price) - toMinor(a.base_price));
      default:
        return result;
    }
  }, [catalog.products, categoryId, query, sort]);

  const hasFilters = query.trim() !== '' || categoryId !== 'all';
  const activeCategory = catalog.categories.find((c) => c.id === categoryId);

  const clearFilters = () => {
    setQuery('');
    setCategoryId('all');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {visible.length} product{visible.length === 1 ? '' : 's'}
          {activeCategory ? ` in ${activeCategory.name}` : ''}
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox value={query} onChange={setQuery} placeholder="Search products…" />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort products"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 sm:w-auto"
        >
          <option value="default">Sort: Recommended</option>
          <option value="name">Name (A – Z)</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <CategoryChip label="All" active={categoryId === 'all'} onClick={() => setCategoryId('all')} />
        {catalog.categories.map((c) => (
          <CategoryChip key={c.id} label={c.name} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} />
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          variant={hasFilters ? 'search' : 'empty'}
          title="No matching products"
          description={
            hasFilters
              ? 'Try a different search or clear the filters.'
              : 'No products are available right now.'
          }
          actionLabel={hasFilters ? 'Clear filters' : undefined}
          onAction={hasFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              offer={p.bestOfferId ? offersById.get(p.bestOfferId) ?? null : null}
              currency={currency}
              hasVariants={(catalog.variantsByProduct[p.id]?.length ?? 0) > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900'
      }`}
    >
      {label}
    </button>
  );
}
