import Link from 'next/link';

export function OrdersClosedBanner() {
  return (
    <div className="border-b border-amber-900/30 bg-[#2a1d17]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 text-center sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          Orders paused
        </span>
        <p className="max-w-xl text-sm leading-6 text-zinc-300">
          We&apos;re not taking orders right now. You can still browse the menu and build your cart —
          checkout will reopen soon.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-semibold text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            Browse the menu
          </Link>
        </div>
      </div>
    </div>
  );
}
