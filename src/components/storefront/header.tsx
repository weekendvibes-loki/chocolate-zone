'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/components/storefront/cart-context';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#menu', label: 'Menu' },
  { href: '/products', label: 'Shop' },
  { href: '/offers', label: 'Offers' },
  { href: '#contact', label: 'Contact' },
];

export function StorefrontHeader() {
  const { summary, openCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, menuOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const applySearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const term = searchTerm.trim();
    router.push(term ? `/products?search=${encodeURIComponent(term)}` : '/products');
    setSearchOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/products') return pathname === '/products' || pathname.startsWith('/products/');
    return false;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[#fbf7f0]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-zinc-900 text-amber-400 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-amber-400/60 group-focus-visible:outline-none">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
            </svg>
          </span>
          <span className="hidden font-serif text-lg font-semibold tracking-tight text-zinc-900 sm:block">
            Chocolate Zone
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative py-1.5 text-sm font-medium transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                  active ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-amber-500 transition-transform duration-200 ${
                    active ? 'scale-x-100' : 'scale-x-0 hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative" ref={searchPanelRef}>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-controls="header-search-input"
              className="group grid size-11 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:size-9"
            >
              <svg
                className="size-5 transition-transform duration-200 group-hover:scale-110"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                {searchOpen ? (
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                ) : (
                  <>
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>

            {searchOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 max-w-[calc(100vw-2rem)] animate-[header-slide-down_0.15s_ease-out] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                <form onSubmit={applySearch} className="relative">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                  </svg>
                  <input
                    ref={searchInputRef}
                    id="header-search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products…"
                    className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openCart}
            aria-label="Open cart"
            className="relative grid size-11 place-items-center rounded-lg text-zinc-600 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:size-9"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
            {summary.itemCount > 0 && (
              <span
                key={summary.itemCount}
                className="absolute -right-0.5 -top-0.5 grid size-4 min-w-4 animate-[header-pop_0.25s_ease-out] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white"
              >
                {summary.itemCount > 99 ? '99+' : summary.itemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="grid size-11 place-items-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:size-9 md:hidden"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              ) : (
                <path d="M3.75 7h16.5M3.75 12h16.5M3.75 17h16.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-40 w-full animate-[header-fade-in_0.2s_ease-out] cursor-default bg-zinc-900/40"
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-16 z-50 animate-[header-slide-down_0.2s_ease-out] border-t border-zinc-200 bg-white/95 px-3 py-3 shadow-lg backdrop-blur"
          >
            <div className="space-y-1">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`block rounded-lg px-4 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                      active
                        ? 'bg-amber-50 text-zinc-900'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
