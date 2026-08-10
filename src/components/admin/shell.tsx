'use client';

import { useState } from 'react';
import { Header } from '@/components/admin/header';
import { Sidebar } from '@/components/admin/sidebar';
import { ToastProvider } from '@/components/admin/toast';
import { GlobalLoadingBar } from '@/components/admin/global-loading';

export function AdminShell({ children, email }: { children: React.ReactNode; email: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-full bg-[#faf7f2]">
        <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
          <Sidebar email={email} />
        </div>

        <div
          className={`fixed inset-0 z-40 lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`}
          aria-hidden={!menuOpen}
        >
          <div
            className={`absolute inset-0 bg-zinc-900/60 transition-opacity duration-300 ${
              menuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 ${
              menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar email={email} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>

        <div className="lg:pl-64">
          <Header onMenuClick={() => setMenuOpen(true)} />
          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
      <GlobalLoadingBar />
    </ToastProvider>
  );
}
