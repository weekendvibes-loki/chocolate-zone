'use client';

import Link from 'next/link';
import { useCart } from '@/components/storefront/cart-context';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#menu', label: 'Menu' },
  { href: '/products', label: 'Shop' },
  { href: '#featured', label: 'Offers' },
  { href: '#contact', label: 'Contact' },
];

export function StorefrontHeader() {
  const { summary, openCart } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-900 text-amber-400">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="hidden text-lg font-bold tracking-tight text-zinc-900 sm:block">
            Chocolate Zone
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            className="grid size-9 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={openCart}
            aria-label="Open cart"
            className="relative grid size-9 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
            {summary.itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                {summary.itemCount > 99 ? '99+' : summary.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-zinc-200 px-4 py-2 md:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="whitespace-nowrap text-sm font-medium text-zinc-600"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
