'use client';

import { usePathname } from 'next/navigation';
import { useCart } from '@/components/storefront/cart-context';
import { formatMoney } from '@/lib/pricing/money';

const HIDDEN_PATH_PREFIXES = ['/checkout', '/order-success'];

export function MobileCartBar() {
  const { summary, currency, openCart } = useCart();
  const pathname = usePathname();

  if (summary.itemCount === 0) return null;
  if (HIDDEN_PATH_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <>
      <div aria-hidden className="h-20 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          onClick={openCart}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#2A1710]/95 px-4 py-3 text-[#F5E6D5] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span className="flex items-baseline gap-2">
            <span className="text-sm font-bold">
              {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-xs text-[#E7D5C1]/70">{formatMoney(summary.total, currency ?? 'INR')}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#F2B84B] px-3.5 py-2 text-xs font-bold text-[#1E100B]">
            View cart
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
    </>
  );
}
