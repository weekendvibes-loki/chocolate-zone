'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/components/storefront/cart-context';
import { ChocolateZoneLogo } from '@/components/storefront/chocolate-zone-logo';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/#menu', label: 'Menu' },
  { href: '/products', label: 'Shop' },
  { href: '/offers', label: 'Offers' },
  { href: '/#contact', label: 'Contact' },
];

const iconButton =
  'group relative grid size-11 place-items-center rounded-full border border-cream-300/25 text-cream-200 transition-colors duration-[var(--dur-base)] ease-out-soft hover:border-gold-400/60 hover:bg-gold-400/10 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 motion-reduce:transition-none';

export function StorefrontHeader() {
  const { summary, openCart } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const openMenu = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setClosing(false);
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    if (closing) return;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 200);
  }, [closing]);

  const toggleMenu = useCallback(() => {
    if (menuOpen) closeMenu();
    else openMenu();
  }, [menuOpen, closeMenu, openMenu]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        if (menuOpen) closeMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, menuOpen, closeMenu]);

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
    if (href === '/offers') return pathname === '/offers' || pathname.startsWith('/offers/');
    return false;
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="relative animate-[header-enter_0.6s_ease-out] border-b border-cream-300/15 bg-cocoa-900 motion-reduce:animate-none">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-20 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <Link
            href="/"
            aria-label="Chocolate Zone — home"
            className="group flex shrink-0 items-center justify-self-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          >
            {/* Height-driven container: the logo keeps its intrinsic aspect
                ratio, so the script wordmark is no longer clipped. */}
            <span className="relative flex h-11 items-center transition-colors duration-[var(--dur-base)] group-hover:opacity-90 motion-reduce:transition-none sm:h-14 lg:h-16">
              <ChocolateZoneLogo className="h-full w-auto" />
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className="group relative inline-flex min-h-11 items-center rounded-lg px-4 text-[0.8rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-[var(--dur-base)] ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 motion-reduce:transition-none"
                >
                  <span className={active ? 'text-gold-400' : 'text-cream-200 group-hover:text-ivory'}>
                    {link.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-4 bottom-2 h-0.5 origin-left rounded-full bg-gold-400 transition-transform duration-[var(--dur-base)] ease-out-soft motion-reduce:transition-none ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center justify-end gap-1 sm:gap-1.5">
            <div className="relative" ref={searchPanelRef}>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search"
                aria-expanded={searchOpen}
                aria-controls="header-search-input"
                className={iconButton}
              >
                <span className="relative block size-5" aria-hidden="true">
                  <svg
                    className={`absolute inset-0 size-5 transition-all duration-[var(--dur-base)] ease-out-soft motion-reduce:transition-none ${
                      searchOpen
                        ? 'scale-50 -rotate-90 opacity-0'
                        : 'scale-100 rotate-0 opacity-100'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.35-4.35" strokeLinecap="round" />
                  </svg>
                  <svg
                    className={`absolute inset-0 size-5 transition-all duration-[var(--dur-base)] ease-out-soft motion-reduce:transition-none ${
                      searchOpen
                        ? 'scale-100 rotate-0 opacity-100'
                        : 'scale-50 rotate-90 opacity-0'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </span>
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-[header-slide-down_0.15s_ease-out] rounded-xl border border-cream-300/15 bg-cocoa-950 p-2 shadow-2xl motion-reduce:animate-none">
                  <form onSubmit={applySearch} className="relative">
                    <svg
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cream-200/50"
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
                      className="w-full rounded-lg border border-cream-300/20 bg-cocoa-900 py-2.5 pl-9 pr-11 text-sm text-ivory placeholder:text-cream-200/45 focus:border-gold-400/60 focus:outline-none focus:ring-2 focus:ring-gold-400/30"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          searchInputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-cream-200/60 transition-colors hover:bg-cream-300/10 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
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
                className="size-5"
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
                  className="absolute -right-1 -top-1 grid size-5 min-w-5 animate-[badge-pop_0.4s_ease-out] place-items-center rounded-full bg-gold-400 px-1 text-[0.65rem] font-bold text-cocoa-950 ring-2 ring-cocoa-900 motion-reduce:animate-none"
                >
                  {summary.itemCount > 99 ? '99+' : summary.itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={toggleMenu}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className={`${iconButton} lg:hidden`}
            >
              <span className="relative block h-3.5 w-5" aria-hidden="true">
                <span
                  className={`absolute left-0 top-0 h-[2px] w-full rounded-full bg-current transition-transform duration-[var(--dur-base)] ease-out-soft motion-reduce:transition-none ${
                    menuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-1.5 h-[2px] w-full rounded-full bg-current transition-all duration-[var(--dur-base)] ease-out-soft motion-reduce:transition-none ${
                    menuOpen ? 'scale-x-0 opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-3 h-[2px] w-full rounded-full bg-current transition-transform duration-[var(--dur-base)] ease-out-soft motion-reduce:transition-none ${
                    menuOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className={`fixed inset-x-0 bottom-0 top-16 z-40 w-full cursor-default bg-cocoa-950/60 ${
              closing
                ? 'animate-[header-fade-out_0.2s_ease-in_forwards]'
                : 'animate-[header-fade-in_0.2s_ease-out]'
            }`}
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className={`absolute inset-x-0 top-16 z-50 border-t border-cream-300/10 bg-cocoa-900 px-4 pb-5 pt-2 shadow-2xl ${
              closing
                ? 'animate-[menu-exit_0.2s_ease-in_forwards]'
                : 'animate-[header-slide-down_0.25s_ease-out]'
            }`}
          >
            <ul className="divide-y divide-cream-300/10">
              {navLinks.map((link, i) => {
                const active = isActive(link.href);
                return (
                  <li
                    key={link.label}
                    className="animate-[menu-item-rise_0.3s_ease-out_both] motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    <Link
                      href={link.href}
                      onClick={closeMenu}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-12 items-center gap-3 rounded-lg px-3.5 text-[0.85rem] font-semibold uppercase tracking-[0.14em] transition-colors duration-[var(--dur-base)] ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 motion-reduce:transition-none ${
                        active
                          ? 'bg-gold-400/10 text-gold-400'
                          : 'text-cream-200 hover:bg-cream-300/10 hover:text-ivory'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-gold-400"
                        />
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
