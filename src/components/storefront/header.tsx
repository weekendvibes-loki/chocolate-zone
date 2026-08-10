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

const iconButton =
  'group relative grid size-11 place-items-center rounded-xl text-[#cbb8a3] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 active:translate-y-0 active:scale-95 sm:size-10';

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
    if (href === '/offers') return pathname === '/offers';
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#241a15]/95 text-[#f3e7d3] shadow-[0_10px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur">
      <div aria-hidden="true" className="h-[3px] w-full bg-gradient-to-r from-[#241a15] via-amber-400/80 to-[#241a15]" />
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-20">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 justify-self-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:gap-3"
        >
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#3a2418] to-[#1c120c] ring-1 ring-amber-400/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_22px_rgba(251,191,36,0.28)] group-hover:ring-amber-400/80">
            <svg
              className="size-5 text-amber-400 transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
              <path d="M9.5 13.5h5M9.5 16h5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex flex-col justify-center leading-none">
            <span className="font-serif text-[1.05rem] font-semibold tracking-tight text-[#f3e7d3] transition-colors duration-200 group-hover:text-white sm:text-xl">
              Chocolate Zone
            </span>
            <span className="mt-1 hidden text-[0.55rem] font-semibold uppercase tracking-[0.34em] text-amber-400/90 sm:block">
              Artisan Chocolatier
            </span>
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-7 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`group relative py-2 text-[0.8rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-200 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                  active ? 'text-amber-300' : 'text-[#cbb8a3] hover:text-[#f3e7d3]'
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-[3px] h-[2px] origin-left rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-transform duration-300 ease-out ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-1.5">
          <div className="relative" ref={searchPanelRef}>
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-controls="header-search-input"
              className={iconButton}
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
              <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-[header-slide-down_0.15s_ease-out] rounded-2xl border border-[#3a2a20] bg-[#1f1510] p-2 shadow-2xl">
                <form onSubmit={applySearch} className="relative">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a7468]"
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
                    className="w-full rounded-xl border border-[#3a2a20] bg-[#241a15] py-2.5 pl-9 pr-9 text-sm text-[#f3e7d3] placeholder:text-[#7d6a5b] focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-[#8a7468] transition-colors hover:bg-[#3a2a20] hover:text-[#f3e7d3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
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
            className={iconButton}
          >
            <svg
              className="size-5 transition-transform duration-200 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M6 7h12l1 13H5L6 7Z" strokeLinejoin="round" />
              <path d="M9 10a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
            {summary.itemCount > 0 && (
              <span
                key={summary.itemCount}
                className="absolute -right-1 -top-1 grid size-5 min-w-5 animate-[header-pop_0.25s_ease-out] place-items-center rounded-full bg-amber-400 px-1 text-[0.65rem] font-bold text-[#241a15] ring-2 ring-[#241a15]"
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
            className={`${iconButton} lg:hidden`}
          >
            <span className="relative block h-3.5 w-5" aria-hidden="true">
              <span
                className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
                  menuOpen ? 'top-1.5 rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
                  menuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-3 h-[2px] w-full rounded-full bg-current transition-all duration-300 ${
                  menuOpen ? 'top-1.5 -rotate-45' : ''
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-40 w-full animate-[header-fade-in_0.2s_ease-out] cursor-default bg-[#120b08]/60 backdrop-blur-sm"
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-16 z-50 animate-[header-slide-down_0.25s_ease-out] border-t border-[#3a2a20]/70 bg-[#241a15]/95 px-4 pb-5 pt-2 shadow-2xl backdrop-blur"
          >
            <ul className="divide-y divide-[#3a2a20]/50">
              {navLinks.map((link, i) => {
                const active = isActive(link.href);
                return (
                  <li
                    key={link.label}
                    className="animate-[menu-item-rise_0.3s_ease-out_both]"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex min-h-12 items-center gap-3 px-2 text-[0.85rem] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                        active ? 'text-amber-300' : 'text-[#cbb8a3] hover:text-white'
                      }`}
                    >
                      {active && (
                        <span className="size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
                      )}
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
