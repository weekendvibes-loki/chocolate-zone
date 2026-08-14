'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatMoney, menuWasPriceMinor, toMinor } from '@/lib/pricing/money';
import { discountLabel, isBundleOffer } from '@/components/storefront/offer-label';
import { StockIndicator } from '@/components/storefront/stock-indicator';
import { ProductImageFallback } from '@/components/storefront/product-image-fallback';
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
  const wasMinor = offer && !isBundle ? null : menuWasPriceMinor(sellingMinor);

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
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[#E7D5C1] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#B3703D]/50 hover:shadow-xl">
      <Link
        href={detailsHref}
        aria-label={product.name}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-[#f5ede1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
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
        {offer && !isBundle ? (
          <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-zinc-900 shadow-sm">
            {discountLabel(offer, currency)}
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-[#F2B84B] px-2.5 py-1 text-[11px] font-bold text-[#3A2417] shadow-sm">
            10% OFF
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={detailsHref}
          className="mt-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <h3 className="line-clamp-2 min-h-12 font-serif text-base font-semibold leading-snug text-[#2A1710] transition-colors group-hover:text-zinc-600">
            {product.name}
          </h3>
        </Link>
        {categoryName && (
          <span className="mt-1 block text-[11px] font-semibold uppercase tracking-widest text-[#B3703D]">
            {categoryName}
          </span>
        )}
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          {wasMinor !== null && (
            <span className="text-sm font-medium text-zinc-400 line-through">
              {formatMoney(wasMinor, currency)}
            </span>
          )}
          <span className="text-xl font-bold text-[#2A1710]">{formatMoney(sellingMinor, currency)}</span>
          {wasMinor !== null && (
            <span className="rounded-full bg-[#F2B84B] px-2 py-0.5 text-[10px] font-bold text-[#3A2417]">
              10% OFF
            </span>
          )}
        </p>
        <div className="mt-1.5">
          <StockIndicator stock={product.stock_qty} />
        </div>
        <div className="mt-4 flex flex-1 items-end">
          {hasVariants ? (
            <Link
              href={detailsHref}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2A1710] px-4 py-2.5 text-sm font-semibold text-[#F5E6D5] transition-colors hover:bg-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Customize & Add
            </Link>
          ) : cartItem ? (
            <div
              role="group"
              aria-label={`Quantity for ${product.name}`}
              className="flex w-full animate-[stepper-in_0.25s_ease-out] items-center justify-center gap-2.5 motion-reduce:animate-none"
            >
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                aria-label="Decrease quantity"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#E7D5C1] bg-[#FFF7EA] text-[#B3703D] transition-colors hover:border-[#F2B84B] hover:bg-[#F2B84B]/25 hover:text-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:bg-[#F2B84B]/50"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </button>
              <span
                aria-live="polite"
                className="flex h-11 items-center justify-center gap-1 rounded-xl border border-[#E7D5C1] bg-[#FFF7EA] px-3"
              >
                <svg className="size-3.5 text-[#B3703D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-base font-bold text-[#2A1710]">{cartItem.quantity}</span>
              </span>
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                aria-label="Increase quantity"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2A1710] text-[#F5E6D5] transition-colors hover:bg-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 active:bg-[#1E100B]/90"
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
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#2A1710] px-4 py-2.5 text-sm font-semibold text-[#F5E6D5] transition-colors hover:bg-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {outOfStock ? 'Out of stock' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
