'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatMoney, toMinor } from '@/lib/pricing/money';
import { discountLabel } from '@/components/storefront/offer-label';
import { StockIndicator } from '@/components/storefront/stock-indicator';
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
}: {
  product: ProductCardProduct;
  offer: Offer | null;
  currency: string;
  hasVariants?: boolean;
}) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const detailsHref = `/products/${product.id}`;

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

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={detailsHref}
        aria-label={product.name}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-zinc-100"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-zinc-300">
            <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
            </svg>
          </span>
        )}
        {offer && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-zinc-900">
            {discountLabel(offer, currency)}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <Link href={detailsHref} className="transition-colors group-hover:text-zinc-600">
          <h3 className="truncate text-sm font-semibold text-zinc-900">{product.name}</h3>
        </Link>
        <p className="mt-1 text-sm font-medium text-zinc-700">
          {formatMoney(toMinor(product.base_price), currency)}
        </p>
        <div className="mt-1">
          <StockIndicator stock={product.stock_qty} />
        </div>
        {hasVariants ? (
          <Link
            href={detailsHref}
            className="mt-3 inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white"
          >
            Customize & Add
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock_qty === 0}
            className="mt-3 inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}
