import Link from 'next/link';

/**
 * Rendered by pages while `catalog.shop.ordering_enabled` is false. Plain
 * static markup — no live region, so the status is announced only when the
 * user reaches it, never repeatedly.
 */
export function OrdersClosedBanner() {
  return (
    <div className="border-b border-terracotta-600/30 bg-cream-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-2 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-terracotta-700">
          <span className="size-1.5 rounded-full bg-terracotta-600" aria-hidden="true" />
          Orders paused
        </span>
        <span className="text-xs text-cocoa-600/85">
          We&apos;re not taking orders right now — checkout reopens soon.
        </span>
        <Link
          href="/products"
          className="inline-flex min-h-11 items-center px-1 text-xs font-semibold text-terracotta-600 underline-offset-4 transition-colors duration-[var(--dur-base)] ease-out-soft hover:text-terracotta-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-600 motion-reduce:transition-none"
        >
          Browse the menu
        </Link>
      </div>
    </div>
  );
}
