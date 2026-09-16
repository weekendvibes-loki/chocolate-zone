'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatMoney, toMinor } from '@/lib/pricing/money';
import { discountLabel, isBundleOffer } from '@/components/storefront/offer-label';
import { StockIndicator } from '@/components/storefront/stock-indicator';
import { ProductImageFallback } from '@/components/storefront/product-image-fallback';
import { Badge } from '@/components/storefront/ui/badge';
import { useCart } from '@/components/storefront/cart-context';
import { useToast } from '@/components/admin/toast';
import type { Offer } from '@/types/domain';

export interface ProductCardProduct {
  id: string;
  name: string;
  base_price: string;
  image_url: string | null;
  stock_qty: number | null;
}

export function ProductCard({
  product,
  offer,
  currency,
  hasVariants = false,
  categoryName,
}: {
  product: ProductCardProduct;
  offer: Offer | null;
  currency: string;
  hasVariants?: boolean;
  categoryName?: string;
}) {
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const { toast } = useToast();
  const detailsHref = `/products/${product.id}`;
  const outOfStock = product.stock_qty === 0;
  const sellingMinor = toMinor(product.base_price);
  const isBundle = offer !== null && isBundleOffer(offer);

  const cartItem = items.find((i) => i.key === product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      imageUrl: product.image_url,
      variantIds: [],
      variantLabel: null,
      unitPrice: toMinor(product.base_price),
      offer,
      currency,
    });
    toast('success', 'Added to cart');
  };

  const handleQuantityChange = (delta: number) => {
    if (!cartItem) return;
    const next = cartItem.quantity + delta;
    if (next <= 0) removeItem(cartItem.key);
    else updateQuantity(cartItem.key, next);
  };

  return (
    <div className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-cream-300 bg-cream-100 transition-[border-color,box-shadow] duration-[var(--dur-base)] ease-out-soft hover:border-terracotta-600/50 hover:shadow-lg motion-reduce:transition-none">
      <Link
        href={detailsHref}
        aria-label={product.name}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-cream-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cocoa-900"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <ProductImageFallback name={product.name} />
        )}
        {offer && !isBundle && (
          <Badge variant="offer" className="absolute left-2 top-2 max-w-[calc(100%_-_1rem)] sm:left-3 sm:top-3 sm:max-w-[calc(100%_-_1.5rem)]">
            {discountLabel(offer, currency)}
          </Badge>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link
          href={detailsHref}
          className="mt-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
        >
          <h3 className="line-clamp-2 min-h-12 font-display text-base font-semibold leading-snug text-cocoa-900 transition-colors group-hover:text-terracotta-700">
            {product.name}
          </h3>
        </Link>
        {categoryName && (
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-widest text-terracotta-700">
            {categoryName}
          </span>
        )}
        <p className="mt-3 text-lg font-semibold tabular-nums text-cocoa-900 sm:text-xl">
          {formatMoney(sellingMinor, currency)}
        </p>
        <div className="mt-1.5">
          <StockIndicator stock={product.stock_qty} />
        </div>
        <div className="mt-4 flex flex-1 items-end">
          {hasVariants ? (
            <Link
              href={detailsHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cocoa-900 px-2 py-2.5 text-center text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              Customize & Add
            </Link>
          ) : cartItem ? (
            <div
              role="group"
              aria-label={`Quantity for ${product.name}`}
              className="flex w-full animate-[stepper-in_0.25s_ease-out] items-stretch overflow-hidden rounded-xl border border-cream-300 bg-ivory motion-reduce:animate-none"
            >
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                aria-label="Decrease quantity"
                className="grid h-11 w-11 shrink-0 place-items-center text-terracotta-700 transition-colors hover:bg-gold-400/25 hover:text-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cocoa-900 active:bg-gold-400/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
              <span
                aria-live="polite"
                className="flex h-11 min-w-0 flex-1 items-center justify-center border-x border-cream-300 px-1 text-base font-bold tabular-nums text-cocoa-900 sm:px-3"
              >
                {cartItem.quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                aria-label="Increase quantity"
                className="grid h-11 w-11 shrink-0 place-items-center bg-cocoa-900 text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400 active:bg-cocoa-950/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-cocoa-900 px-2 py-2.5 text-center text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {outOfStock ? 'Out of stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
