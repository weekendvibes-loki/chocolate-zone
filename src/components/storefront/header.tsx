'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCart } from '@/components/storefront/cart-context';
import { ChocolateZoneLogo } from '@/components/storefront/chocolate-zone-logo';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#menu', label: 'Menu' },
  { href: '/products', label: 'Shop' },
  { href: '/offers', label: 'Offers' },
  { href: '#contact', label: 'Contact' },
];

const iconButton =
  'group relative grid size-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#E8D5BE] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#F2B84B]/50 hover:bg-[#F2B84B]/10 hover:text-[#F2B84B] hover:shadow-[0_0_20px_rgba(242,184,75,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60 active:translate-y-0 active:scale-95 sm:size-10';

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
    if (href === '/offers') return pathname === '/offers';
    return false;
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="relative animate-[header-enter_0.6s_ease-out] shadow-[0_12px_30px_-14px_rgba(0,0,0,0.55)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#2B1810] via-[#24140D] to-[#170D08]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_140%_at_50%_0%,rgba(242,184,75,0.14),transparent_60%)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F2B84B]/70 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#F2B84B]/25 to-transparent"
        />

        <div className="relative mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-20">
          <Link
            href="/"
            aria-label="Chocolate Zone — home"
            className="group flex shrink-0 items-center justify-self-start rounded-xl transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/70"
          >
            <span className="relative block aspect-[4/3] w-14 transition-all duration-300 group-hover:drop-shadow-[0_0_16px_rgba(242,184,75,0.35)] sm:w-20 lg:w-24">
              <ChocolateZoneLogo className="absolute inset-0 h-full w-full" />
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-8 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`group relative px-1 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.18em] transition-all duration-300 hover:-translate-y-px hover:drop-shadow-[0_0_6px_rgba(242,184,75,0.4)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60 ${
                    active ? 'text-[#F2B84B]' : 'text-[#E8D5BE] hover:text-[#FFF7EA]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 bottom-0 rounded-lg bg-[radial-gradient(70%_140%_at_50%_100%,rgba(179,112,61,0.2),transparent_70%)] transition-opacity duration-300 ${
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  />
                  <span className="relative">{link.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-1 -bottom-[3px] h-[2px] origin-left rounded-full bg-gradient-to-r from-[#B3703D] to-[#F2B84B] shadow-[0_0_8px_rgba(242,184,75,0.6)] transition-transform duration-300 ease-out ${
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
                <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] animate-[header-slide-down_0.15s_ease-out] overflow-hidden rounded-2xl border border-white/10 bg-[#24140D]/95 p-2 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F2B84B]/50 to-transparent"
                  />
                  <form onSubmit={applySearch} className="relative">
                    <svg
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#E8D5BE]/50"
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
                      className="w-full rounded-xl border border-white/10 bg-[#2B1810] py-2.5 pl-9 pr-9 text-sm text-[#FFF7EA] placeholder:text-[#E8D5BE]/45 focus:border-[#F2B84B]/70 focus:outline-none focus:ring-2 focus:ring-[#F2B84B]/30"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          searchInputRef.current?.focus();
                        }}
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-[#E8D5BE]/60 transition-colors hover:bg-[#3a2a20] hover:text-[#FFF7EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60"
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
                  className="absolute -right-1 -top-1 grid size-5 min-w-5 animate-[header-pop_0.25s_ease-out] place-items-center rounded-full bg-[#F2B84B] px-1 text-[0.65rem] font-bold text-[#24140D] shadow-[0_0_10px_rgba(242,184,75,0.5)] ring-2 ring-[#24140D]"
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
      </div>

      {menuOpen && (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className={`fixed inset-x-0 bottom-0 top-16 z-40 w-full cursor-default bg-[#120b08]/60 backdrop-blur-sm ${
              closing
                ? 'animate-[header-fade-out_0.2s_ease-in_forwards]'
                : 'animate-[header-fade-in_0.2s_ease-out]'
            }`}
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile navigation"
            className={`absolute inset-x-0 top-16 z-50 border-t border-white/10 bg-gradient-to-b from-[#2B1810] to-[#24140D]/95 px-4 pb-5 pt-2 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)] backdrop-blur-xl ${
              closing
                ? 'animate-[menu-exit_0.2s_ease-in_forwards]'
                : 'animate-[header-slide-down_0.25s_ease-out]'
            }`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_100%_at_50%_0%,rgba(179,112,61,0.22),transparent_70%)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
            />
            <ul className="divide-y divide-white/[0.06]">
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
                      onClick={closeMenu}
                      className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-[0.85rem] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2B84B]/60 ${
                        active ? 'text-[#F2B84B]' : 'text-[#E8D5BE] hover:text-white'
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden="true"
                          className="size-1.5 shrink-0 rounded-full bg-[#F2B84B] shadow-[0_0_8px_rgba(242,184,75,0.6)]"
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
