import Link from 'next/link';

export function OrdersClosedBanner() {
  return (
    <div className="border-b border-[#B3703D]/25 bg-[#2A1710]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-2.5 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#F2B84B]">
          <span
            className="size-1.5 rounded-full bg-[#F2B84B] shadow-[0_0_8px_rgba(242,184,75,0.7)]"
            aria-hidden="true"
          />
          Orders paused
        </span>
        <span className="text-xs text-[#E7D5C1]/80">
          We&apos;re not taking orders right now — checkout reopens soon.
        </span>
        <Link
          href="/products"
          className="text-xs font-semibold text-[#F2B84B] underline-offset-4 transition-colors duration-300 hover:text-[#FFF7EA] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60"
        >
          Browse the menu
        </Link>
      </div>
    </div>
  );
}
