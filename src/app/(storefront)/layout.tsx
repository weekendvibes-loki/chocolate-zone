import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/admin/toast';
import { StorefrontHeader } from '@/components/storefront/header';
import { StorefrontFooter } from '@/components/storefront/footer';
import { CartProvider } from '@/components/storefront/cart-context';
import { CartDrawer } from '@/components/storefront/cart-drawer';
import { MobileCartBar } from '@/components/storefront/mobile-cart-bar';

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <ToastProvider>
        <div className="flex min-h-full flex-col bg-white">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cocoa-900 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ivory focus:ring-2 focus:ring-gold-400"
          >
            Skip to content
          </a>
          <StorefrontHeader />
          <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <StorefrontFooter />
          <CartDrawer />
          <MobileCartBar />
        </div>
      </ToastProvider>
    </CartProvider>
  );
}
