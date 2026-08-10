'use client';

import Link from 'next/link';

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200/80 bg-[#fbf7f0]/90 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="grid size-11 shrink-0 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 lg:hidden"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3.75 7h16.5M3.75 12h16.5M3.75 17h16.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="hidden items-center gap-2 md:flex">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">Admin</span>
      </div>

      <div className="flex-1" />

      <Link
        href="/"
        className="hidden items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:flex"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 10 12 3l9 7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" strokeLinejoin="round" />
        </svg>
        Storefront
      </Link>
    </header>
  );
}
