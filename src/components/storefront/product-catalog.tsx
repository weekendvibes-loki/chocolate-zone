'use client';

import { useMemo, useState } from 'react';
import { SearchBox } from '@/components/admin/search-box';
import { ProductCard } from '@/components/storefront/product-card';
import { BackButton } from '@/components/storefront/back-button';
import { discountLabel } from '@/components/storefront/offer-label';
import { toMinor } from '@/lib/pricing/money';
import type { Catalog, Offer } from '@/types/domain';

type SortKey = 'default' | 'name' | 'price-asc' | 'price-desc';

export function ProductCatalog({
  catalog,
  initialCategory,
  initialQuery,
  initialOfferId,
}: {
  catalog: Catalog;
  initialCategory?: string;
  initialQuery?: string;
  initialOfferId?: string;
}) {
  const offersById = useMemo(() => new Map(catalog.offers.map((o) => [o.id, o])), [catalog.offers]);
  const categoriesById = useMemo(() => new Map(catalog.categories.map((c) => [c.id, c])), [catalog.categories]);
  const currency = catalog.shop.currency;

  const [query, setQuery] = useState(initialQuery ?? '');
  const [categoryId, setCategoryId] = useState<string>(
    initialCategory && catalog.categories.some((c) => c.id === initialCategory) ? initialCategory : 'all',
  );
  const [offerId, setOfferId] = useState<string>(
    initialOfferId && offersById.has(initialOfferId) ? initialOfferId : 'all',
  );
  const [sort, setSort] = useState<SortKey>('default');

  const activeOffer: Offer | undefined =
    offerId !== 'all' ? offersById.get(offerId) : undefined;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = catalog.products;
    if (activeOffer && !activeOffer.applies_to_all) {
      const offerIds = new Set(activeOffer.offerProductIds);
      filtered = filtered.filter((p) => offerIds.has(p.id));
    }
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
  }, [catalog.products, activeOffer, categoryId, query, sort]);

  const hasFilters = query.trim() !== '' || categoryId !== 'all' || Boolean(activeOffer);
  const activeCategory = catalog.categories.find((c) => c.id === categoryId);

  const clearFilters = () => {
    setQuery('');
    setCategoryId('all');
    setOfferId('all');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <BackButton />
      <div className="mb-10 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">The collection</span>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Chocolate &amp; treats
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-base">
          Small-batch chocolates, indulgent bites and handcrafted treats — made with care and ready to enjoy.
        </p>
      </div>

      {activeOffer && (
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="inline-flex shrink-0 items-center rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-900">
              {discountLabel(activeOffer, currency)}
            </span>
            <div>
              <h2 className="font-serif text-lg font-semibold text-zinc-900">{activeOffer.title}</h2>
              <p className="text-sm text-zinc-600">
                Showing treats included in this offer
                {activeOffer.applies_to_all ? ' — the discount applies to the whole collection.' : '.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
            Browse all offers
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox value={query} onChange={setQuery} placeholder="Search the collection…" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort products"
              className="w-full min-h-11 appearance-none rounded-xl border border-zinc-300 bg-white pl-3 pr-9 text-sm font-medium text-zinc-700 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30 sm:w-auto"
            >
              <option value="default">Sort: Recommended</option>
              <option value="name">Name (A – Z)</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CategoryChip label="All" active={categoryId === 'all'} onClick={() => setCategoryId('all')} />
        {catalog.categories.map((c) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            emoji={c.emoji}
            active={categoryId === c.id}
            onClick={() => setCategoryId(c.id)}
          />
        ))}
      </div>

      <p className="mb-5 text-sm text-zinc-500">
        {visible.length} treat{visible.length === 1 ? '' : 's'}
        {activeCategory ? ` in ${activeCategory.name}` : ''}
        {activeOffer && !activeCategory ? ` in ${activeOffer.title}` : ''}
      </p>

      {visible.length === 0 ? (
        <EmptyResults
          hasFilters={hasFilters}
          offerActive={Boolean(activeOffer)}
          offerTitle={activeOffer?.title ?? null}
          onClear={clearFilters}
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
              categoryName={categoriesById.get(p.category_id)?.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
        active
          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
          : 'border-zinc-300 bg-white text-zinc-600 hover:border-zinc-900 hover:text-zinc-900'
      }`}
    >
      {emoji && (
        <span aria-hidden="true" className={active ? 'opacity-90' : ''}>
          {emoji}
        </span>
      )}
      {label}
    </button>
  );
}

function EmptyResults({
  hasFilters,
  offerActive,
  offerTitle,
  onClear,
}: {
  hasFilters: boolean;
  offerActive: boolean;
  offerTitle: string | null;
  onClear: () => void;
}) {
  const emptyShelf = !hasFilters && !offerActive;
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-[#fbf7f0] px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
      </span>
      <h3 className="mt-5 font-serif text-xl font-semibold text-zinc-900">
        {offerActive ? 'Nothing in this offer yet' : emptyShelf ? 'The shelf is empty for now' : 'No treats found'}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
        {offerActive
          ? offerTitle
            ? `“${offerTitle}” has no products attached right now.`
            : 'This offer has no products attached right now.'
          : emptyShelf
            ? 'New treats are being made fresh — check back soon.'
            : 'Try another search or browse a different category.'}
      </p>
      {offerActive || hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-6 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {offerActive ? 'Browse all products' : 'Clear filters'}
        </button>
      ) : null}
    </div>
  );
}
