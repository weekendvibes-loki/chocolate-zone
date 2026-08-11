import Link from 'next/link';

export function OrdersClosedBanner() {
  return (
    <div className="border-b border-[#B3703D]/30 bg-[#FFF7EA]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-2 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8A4F26]">
          <span className="size-1.5 rounded-full bg-[#B3703D]" aria-hidden="true" />
          Orders paused
        </span>
        <span className="text-xs text-[#5B3A24]/85">
          We&apos;re not taking orders right now — checkout reopens soon.
        </span>
        <Link
          href="/products"
          className="text-xs font-semibold text-[#B3703D] underline-offset-4 transition-colors duration-300 hover:text-[#8A4F26] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3703D]/60"
        >
          Browse the menu
        </Link>
      </div>
    </div>
  );
}
