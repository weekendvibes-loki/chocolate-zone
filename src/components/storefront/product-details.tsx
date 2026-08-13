'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatMoney, toMinor } from '@/lib/pricing/money';
import { discountLabel, isBundleOffer } from '@/components/storefront/offer-label';
import { StockIndicator } from '@/components/storefront/stock-indicator';
import { ProductCard } from '@/components/storefront/product-card';
import { useCart } from '@/components/storefront/cart-context';
import { useToast } from '@/components/admin/toast';
import type { Catalog, CatalogProduct, ProductDetail, ProductVariant } from '@/types/domain';

interface VariantGroup {
  name: string;
  options: ProductVariant[];
}

function groupVariants(variants: ProductVariant[]): VariantGroup[] {
  const map = new Map<string, ProductVariant[]>();
  for (const v of variants) {
    const options = map.get(v.name) ?? [];
    options.push(v);
    map.set(v.name, options);
  }
  return Array.from(map, ([name, options]) => ({ name, options }));
}

export function ProductDetails({
  detail,
  catalog,
  related,
}: {
  detail: ProductDetail;
  catalog: Catalog;
  related: CatalogProduct[];
}) {
  const { product, variants, category, bestOffer } = detail;
  const currency = catalog.shop.currency;
  const offersById = useMemo(() => new Map(catalog.offers.map((o) => [o.id, o])), [catalog.offers]);
  const categoriesById = useMemo(() => new Map(catalog.categories.map((c) => [c.id, c])), [catalog.categories]);
  const { addItem, openCart } = useCart();
  const { toast } = useToast();

  const groups = useMemo(() => groupVariants(variants), [variants]);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(groups.map((g) => [g.name, g.options[0].option])),
  );

  const images = useMemo(() => (product.image_url ? [product.image_url] : []), [product.image_url]);
  const [activeImage, setActiveImage] = useState(0);

  const selectedVariants = useMemo(() => {
    const result: ProductVariant[] = [];
    for (const g of groups) {
      const variant = g.options.find((o) => o.option === selected[g.name]);
      if (variant) result.push(variant);
    }
    return result;
  }, [groups, selected]);

  const variantLabel = selectedVariants.length > 0
    ? selectedVariants.map((v) => `${v.name}: ${v.option}`).join(', ')
    : null;

  const baseMinor = toMinor(product.base_price);
  const deltaMinor = selectedVariants.reduce((sum, v) => sum + toMinor(v.price_delta), 0);
  const priceMinor = baseMinor + deltaMinor;

  const outOfStock = product.stock_qty === 0;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      imageUrl: product.image_url,
      variantIds: selectedVariants.map((v) => v.id),
      variantLabel,
      unitPrice: priceMinor,
      offer: bestOffer,
      currency,
    });
    toast('success', 'Added to cart');
    openCart();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-zinc-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          Home
        </Link>
        <span aria-hidden="true" className="text-zinc-300">/</span>
        <Link href="/products" className="transition-colors hover:text-zinc-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          Shop
        </Link>
        {category && (
          <>
            <span aria-hidden="true" className="text-zinc-300">/</span>
            <Link href={`/products?category=${category.id}`} className="transition-colors hover:text-zinc-900 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              {category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true" className="text-zinc-300">/</span>
        <span className="truncate font-medium text-zinc-900" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-[#f5ede1] shadow-sm">
            {images.length > 0 ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-zinc-300">
                <svg className="size-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                </svg>
              </span>
            )}
            {bestOffer && !isBundleOffer(bestOffer) && (
              <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-zinc-900 shadow-sm">
                {discountLabel(bestOffer, currency)}
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-pressed={activeImage === i}
                  className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 bg-[#f5ede1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    activeImage === i ? 'border-amber-500' : 'border-transparent'
                  }`}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {category && (
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">{category.name}</span>
          )}
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-zinc-900">{formatMoney(priceMinor, currency)}</span>
            {bestOffer && !isBundleOffer(bestOffer) && (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-zinc-900">
                {discountLabel(bestOffer, currency)}
              </span>
            )}
          </div>
          {deltaMinor !== 0 && (
            <p className="mt-1 text-sm text-zinc-500">
              Base price: {formatMoney(baseMinor, currency)}
            </p>
          )}

          <div className="mt-3">
            <StockIndicator stock={product.stock_qty} />
          </div>

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-zinc-600">{product.description}</p>
          )}

          {groups.length > 0 && (
            <div className="mt-7 space-y-6">
              {groups.map((g) => (
                <fieldset key={g.name}>
                  <legend className="text-sm font-semibold text-zinc-900">{g.name}</legend>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {g.options.map((v) => {
                      const delta = toMinor(v.price_delta);
                      const isSelected = selected[g.name] === v.option;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelected((prev) => ({ ...prev, [g.name]: v.option }))}
                          aria-pressed={isSelected}
                          className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                            isSelected
                              ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                              : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900'
                          }`}
                        >
                          {v.option}
                          {delta !== 0 && (
                            <span className={isSelected ? 'text-zinc-300' : 'text-zinc-500'}>
                              {' '}
                              ({delta > 0 ? '+' : '-'}
                              {formatMoney(Math.abs(delta), currency)})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-64"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
            {outOfStock ? 'Out of stock' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-zinc-200 pt-10">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Keep exploring</span>
          <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            You might also like
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => {
              const offer = p.bestOfferId ? (offersById.get(p.bestOfferId) ?? null) : null;
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  offer={offer}
                  currency={currency}
                  hasVariants={(catalog.variantsByProduct[p.id]?.length ?? 0) > 0}
                  categoryName={categoriesById.get(p.category_id)?.name}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
