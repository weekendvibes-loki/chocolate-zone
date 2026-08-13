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
          <StorefrontHeader />
          <main className="flex-1">{children}</main>
          <StorefrontFooter />
          <CartDrawer />
          <MobileCartBar />
        </div>
      </ToastProvider>
    </CartProvider>
  );
}
