'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/storefront/cart-context';
import { formatMoney } from '@/lib/pricing/money';

const HIDDEN_PATH_PREFIXES = ['/checkout', '/order-success'];

export function MobileCartBar() {
  const { summary, currency, openCart } = useCart();
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const visible = summary.itemCount > 0 && !HIDDEN_PATH_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    const bar = barRef.current;
    const shell = bar?.closest<HTMLElement>('.storefront-shell');
    if (!bar || !shell) return;
    const observer = new ResizeObserver(() => {
      shell.style.setProperty('--storefront-cart-height', `${bar.getBoundingClientRect().height}px`);
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
      shell.style.removeProperty('--storefront-cart-height');
    };
  }, [visible]);

  if (!visible) return null;

  return (
      <div ref={barRef} className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 lg:hidden">
        <button
          type="button"
          onClick={openCart}
          aria-haspopup="dialog"
          aria-controls="shopping-cart"
          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-cream-300/20 bg-cocoa-900 px-4 py-3 text-ivory shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="text-sm font-bold">
              {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-sm font-medium tabular-nums text-cream-200">{formatMoney(summary.total, currency ?? 'INR')}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gold-400 px-3.5 py-2 text-xs font-bold text-cocoa-950">
            View cart
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
  );
}
