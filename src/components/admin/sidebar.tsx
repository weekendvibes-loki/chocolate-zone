'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV } from '@/components/admin/nav';

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      <div className="flex items-center gap-2 px-5 h-16 shrink-0 border-b border-zinc-800">
        <span className="grid size-8 place-items-center rounded-lg bg-amber-500 text-zinc-900">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 15a6 6 0 0 0 12 0V9a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6Z" />
            <path d="M10 7V5a2 2 0 0 1 2-2 2 2 0 0 1 2 2" />
            <path d="M4 15v-4" />
          </svg>
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Chocolate Zone</p>
          <p className="text-xs text-zinc-400">Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <span className="block truncate">{item.label}</span>
                  <span
                    className={`mt-0.5 block truncate text-xs font-normal ${
                      active ? 'text-amber-400/70' : 'text-zinc-500'
                    }`}
                  >
                    {item.description}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-zinc-800 px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-zinc-400 transition-colors hover:text-white"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 10 12 3l9 7" />
            <path d="M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
          </svg>
          View storefront
        </Link>
      </div>
    </div>
  );
}
