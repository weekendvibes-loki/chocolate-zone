'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_NAV, type AdminNavIcon } from '@/components/admin/nav';

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
}

function NavIcon({ icon }: { icon: AdminNavIcon }) {
  const common = {
    className: 'size-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    'aria-hidden': true as const,
  };
  switch (icon) {
    case 'dashboard':
      return (
        <svg {...common}>
          <path d="M12 15l3.5-3.5" strokeLinecap="round" />
          <circle cx="12" cy="14" r="6" />
          <path d="M12 8v2" strokeLinecap="round" />
        </svg>
      );
    case 'categories':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'products':
      return (
        <svg {...common}>
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" strokeLinejoin="round" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
    case 'offers':
      return (
        <svg {...common}>
          <path
            d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function Sidebar({
  email,
  onNavigate,
}: {
  email?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = (email?.split('@')[0]?.[0] ?? 'A').toUpperCase();

  async function onSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div className="flex h-full flex-col bg-[#241a15]">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <span className="grid size-9 place-items-center rounded-xl bg-amber-400 text-zinc-900 shadow-sm">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
          </svg>
        </span>
        <div className="leading-tight">
          <p className="font-serif text-sm font-semibold text-white">Chocolate Zone</p>
          <p className="text-xs text-amber-200/60">Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        <ul className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
                    active ? 'bg-white/10 text-amber-300' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-amber-400 transition-opacity ${
                      active ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${active ? 'bg-amber-400/15 text-amber-300' : 'bg-white/5 text-zinc-400 group-hover:text-white'}`}>
                    <NavIcon icon={item.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{item.label}</span>
                    <span className={`mt-0.5 block truncate text-xs font-normal ${active ? 'text-amber-200/60' : 'text-zinc-500'}`}>
                      {item.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-4 border-t border-white/10 px-5 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-zinc-400 transition-colors group-hover:text-white">
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 10 12 3l9 7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" strokeLinejoin="round" />
            </svg>
          </span>
          View storefront
        </Link>

        <div className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-bold text-zinc-900">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-white">{email ?? 'Admin'}</span>
              <span className="block text-[11px] text-zinc-400">Signed in</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            aria-label="Sign out"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
