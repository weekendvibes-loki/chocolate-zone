'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatMoney, toMinor } from '@/lib/pricing/money';
import { discountLabel } from '@/components/storefront/offer-label';
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
      <nav className="mb-6 flex items-center gap-2 text-sm text-zinc-500" aria-label="Breadcrumb">
        <Link href="/products" className="transition-colors hover:text-zinc-900">
          Products
        </Link>
        {category && (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/products?category=${category.id}`} className="transition-colors hover:text-zinc-900">
              {category.name}
            </Link>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-zinc-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
            {images.length > 0 ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
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
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 bg-zinc-100 ${
                    activeImage === i ? 'border-zinc-900' : 'border-transparent'
                  }`}
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{product.name}</h1>
          {category && <p className="mt-1 text-sm text-zinc-500">{category.name}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold text-zinc-900">{formatMoney(priceMinor, currency)}</span>
            {bestOffer && (
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

          <div className="mt-2">
            <StockIndicator stock={product.stock_qty} />
          </div>

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-600">{product.description}</p>
          )}

          {groups.length > 0 && (
            <div className="mt-6 space-y-5">
              {groups.map((g) => (
                <fieldset key={g.name}>
                  <legend className="text-sm font-semibold text-zinc-900">{g.name}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.options.map((v) => {
                      const delta = toMinor(v.price_delta);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelected((prev) => ({ ...prev, [g.name]: v.option }))}
                          aria-pressed={selected[g.name] === v.option}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            selected[g.name] === v.option
                              ? 'border-zinc-900 bg-zinc-900 text-white'
                              : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-900'
                          }`}
                        >
                          {v.option}
                          {delta !== 0 && (
                            <span className={selected[g.name] === v.option ? 'text-zinc-300' : 'text-zinc-500'}>
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
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {outOfStock ? 'Out of stock' : 'Add to Cart'}
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t border-zinc-200 pt-8">
          <h2 className="text-xl font-bold text-zinc-900">Related products</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => {
              const offer = p.bestOfferId ? (offersById.get(p.bestOfferId) ?? null) : null;
              return <ProductCard key={p.id} product={p} offer={offer} currency={currency} />;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
