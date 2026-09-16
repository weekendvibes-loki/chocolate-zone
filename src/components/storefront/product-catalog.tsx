'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ProductCard } from '@/components/storefront/product-card';
import { Badge } from '@/components/storefront/ui/badge';
import { Button } from '@/components/storefront/ui/button';
import { EmptyState } from '@/components/storefront/ui/empty-state';
import { BackButton } from '@/components/storefront/back-button';
import { discountLabel } from '@/components/storefront/offer-label';
import { toMinor } from '@/lib/pricing/money';
import type { Catalog, Offer } from '@/types/domain';

type SortKey = 'default' | 'name' | 'price-asc' | 'price-desc';

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'default', label: 'Recommended' },
  { value: 'name', label: 'Name (A – Z)' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

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
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:py-14">
      <BackButton />
      <div className="catalog-enter catalog-enter-heading mb-8 max-w-2xl sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-700">The collection</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-cocoa-900 sm:text-4xl">
          Chocolate &amp; treats
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-cocoa-500 sm:text-base sm:leading-7">
          Small-batch chocolates, indulgent bites and handcrafted treats — made with care and ready to enjoy.
        </p>
      </div>

      <div className="catalog-enter catalog-enter-filters relative z-10 overflow-visible">
        {activeOffer && (
          <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-cocoa-900 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row">
              <Badge variant="offer" className="shrink-0">
                {discountLabel(activeOffer, currency)}
              </Badge>
              <div>
                <h2 className="font-display text-lg font-semibold text-ivory">{activeOffer.title}</h2>
                <p className="text-sm text-cream-300">
                  Showing treats included in this offer
                  {activeOffer.applies_to_all ? ' — the discount applies to the whole collection.' : '.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex shrink-0 items-center gap-1.5 min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-gold-400 transition-colors hover:bg-ivory/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
              Browse all products
            </button>
          </div>
        )}

      <div className="mb-5">
        <p id="catalog-categories-label" className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-cocoa-500">Browse by category</p>
        <div role="group" aria-labelledby="catalog-categories-label" className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-1 [&::-webkit-scrollbar]:hidden">
          <CategoryChip label="All treats" active={categoryId === 'all'} onClick={() => setCategoryId('all')} />
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
      </div>

      <div className="relative z-10 mb-6 flex flex-col gap-3 overflow-visible border-y border-cream-300 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" aria-atomic="true" className="text-sm text-cocoa-500">
          {visible.length} treat{visible.length === 1 ? '' : 's'}
          {activeCategory ? ` in ${activeCategory.name}` : ''}
          {activeOffer && !activeCategory ? ` in ${activeOffer.title}` : ''}
          {query.trim() ? ` matching “${query.trim()}”` : ''}
        </p>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
            <SortDropdown value={sort} onChange={setSort} />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-terracotta-700 transition-colors hover:bg-ivory hover:text-cocoa-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>
      </div>

      <div className="catalog-enter catalog-enter-grid relative z-0">
        {visible.length === 0 ? (
          <EmptyResults
            hasFilters={hasFilters}
            hasQuery={query.trim() !== ''}
            offerActive={Boolean(activeOffer)}
            offerTitle={activeOffer?.title ?? null}
            onClear={clearFilters}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
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
    </div>
  );
}

function SortDropdown({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, SORT_OPTIONS.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const id = useId();
  const labelId = `${id}-label`;
  const triggerId = `${id}-trigger`;
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() => optionRefs.current[activeIndex]?.focus());
    const dismissOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismissOnOutsidePointer);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', dismissOnOutsidePointer);
    };
  }, [activeIndex, open]);

  const openAt = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(SORT_OPTIONS.length - 1, index)));
    setOpen(true);
  };

  const closeAndRestoreFocus = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const select = (index: number) => {
    onChange(SORT_OPTIONS[index].value);
    closeAndRestoreFocus();
  };

  const moveFocus = (index: number) => {
    const nextIndex = (index + SORT_OPTIONS.length) % SORT_OPTIONS.length;
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        openAt(selectedIndex);
        break;
      case 'Home':
        event.preventDefault();
        openAt(0);
        break;
      case 'End':
        event.preventDefault();
        openAt(SORT_OPTIONS.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) closeAndRestoreFocus();
        else openAt(selectedIndex);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          closeAndRestoreFocus();
        }
        break;
    }
  };

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(SORT_OPTIONS.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        select(activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        closeAndRestoreFocus();
        break;
      case 'Tab':
        // Let the browser move naturally, then remove the popup.
        window.setTimeout(() => setOpen(false), 0);
        break;
    }
  };

  return (
    <>
      <span id={labelId} className="shrink-0 text-xs font-medium text-cocoa-500">
        Sort by
      </span>
      <div
        ref={rootRef}
        className="relative min-w-0 flex-1 sm:flex-none"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={`${labelId} ${triggerId}`}
          onClick={() => (open ? closeAndRestoreFocus() : openAt(selectedIndex))}
          onKeyDown={handleTriggerKeyDown}
          className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-cream-300 bg-cream-100 px-3 text-left text-sm font-medium text-cocoa-900 transition-colors hover:border-terracotta-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 sm:min-w-52"
        >
          <span className="truncate">{SORT_OPTIONS[selectedIndex].label}</span>
          <svg
            aria-hidden="true"
            className={`size-4 shrink-0 text-cocoa-500 transition-transform duration-[var(--dur-fast)] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={`${labelId} ${triggerId}`}
            onKeyDown={handleListboxKeyDown}
            className="catalog-sort-popup absolute right-0 top-full z-30 mt-2 max-h-[min(16rem,calc(100dvh-6rem))] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-2xl border border-cream-300 bg-cream-100 p-1.5 text-cocoa-900 shadow-lg"
          >
            {SORT_OPTIONS.map((option, index) => {
              const selected = option.value === value;
              const active = index === activeIndex;
              return (
                <li
                  key={option.value}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  onFocus={() => setActiveIndex(index)}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => select(index)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 text-sm outline-none transition-colors ${
                    active ? 'bg-cream-200 text-cocoa-900' : 'text-cocoa-500 hover:bg-ivory hover:text-cocoa-900'
                  } focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cocoa-900`}
                >
                  <span>{option.label}</span>
                  <svg
                    aria-hidden="true"
                    className={`size-4 shrink-0 text-terracotta-700 ${selected ? 'opacity-100' : 'opacity-0'}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
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
      className={`flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors duration-[var(--dur-base)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${
        active
          ? 'border-cocoa-900 bg-cocoa-900 text-ivory'
          : 'border-cream-300 bg-cream-100 text-cocoa-500 hover:border-terracotta-700 hover:bg-ivory hover:text-cocoa-900'
      }`}
    >
      {active && (
        <svg className="size-4 shrink-0 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
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
  hasQuery,
  offerActive,
  offerTitle,
  onClear,
}: {
  hasFilters: boolean;
  hasQuery: boolean;
  offerActive: boolean;
  offerTitle: string | null;
  onClear: () => void;
}) {
  const emptyShelf = !hasFilters;
  const title = emptyShelf ? 'The shelf is empty for now' : 'No treats found';
  const description = emptyShelf
    ? 'Fresh treats will be here soon. Check back for the latest collection.'
    : offerActive
      ? `No treats match your current filters${offerTitle ? ` in “${offerTitle}”` : ' in this offer'}. Try browsing all products.`
      : hasQuery
        ? 'Try another search or clear your filters to browse all treats.'
        : 'Try a different category or browse all treats.';

  return (
    <EmptyState
      title={title}
      description={description}
      icon={
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
      }
      action={hasFilters ? <Button onClick={onClear}>Browse all products</Button> : undefined}
    />
  );
}
