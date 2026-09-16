'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/pricing/money';
import { EmptyState } from '@/components/storefront/ui/empty-state';
import { Button } from '@/components/storefront/ui/button';
import { useCart } from '@/components/storefront/cart-context';

export function CartDrawer() {
  const { items, currency, summary, isOpen, closeCart, updateQuantity, removeItem } = useCart();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    }
    // Native modal behavior keeps the rest of the page inert and contains focus.
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (trigger?.isConnected && trigger.tabIndex >= 0 && trigger.getClientRects().length > 0) {
        trigger.focus({ preventScroll: true });
      } else {
        document.querySelector<HTMLElement>('header button[aria-label="Open cart"]')?.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  const removeCartItem = (key: string) => {
    // A removed row must not leave keyboard focus on the document body.
    closeRef.current?.focus({ preventScroll: true });
    removeItem(key);
  };

  const c = currency ?? 'INR';

  return (
    <dialog
      ref={dialogRef}
      id="shopping-cart"
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-cocoa-900 backdrop:bg-cocoa-950/60"
      aria-labelledby="cart-title"
      onCancel={(event) => {
        event.preventDefault();
        closeCart();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeCart();
      }}
    >
      <div
        className="ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain bg-ivory shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cream-300 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
          <h2 id="cart-title" className="font-display text-xl font-semibold text-cocoa-900">Your cart</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid size-11 place-items-center rounded-lg text-cocoa-500 transition-colors hover:bg-cream-200 hover:text-cocoa-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
            <EmptyState
              title="Your cart is empty"
              description="Add a few treats and they'll show up here."
              action={<Button onClick={closeCart}>Continue browsing</Button>}
            />
          </div>
        ) : (
          <>
            <ul aria-label="Cart items" className="min-h-24 flex-1 divide-y divide-cream-300 overflow-y-auto overscroll-contain px-4 sm:px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-terracotta-600">
                        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-cocoa-900">{item.productName}</p>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.key)}
                        aria-label={`Remove ${item.productName} from cart`}
                        className="grid size-11 shrink-0 place-items-center rounded-lg text-cocoa-500 transition-colors hover:bg-danger/5 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {item.variantLabel && <p className="mt-0.5 text-xs text-cocoa-500">{item.variantLabel}</p>}
                    <p className="mt-0.5 text-xs text-cocoa-500">{formatMoney(item.unitPrice, c)} each</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div role="group" aria-label={`Quantity for ${item.productName}`} className="inline-flex items-center overflow-hidden rounded-xl border border-cream-300 bg-cream-100">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity > 1 ? updateQuantity(item.key, item.quantity - 1) : removeCartItem(item.key)
                          }
                          aria-label={`Decrease quantity of ${item.productName}`}
                          className="grid size-11 shrink-0 place-items-center text-terracotta-700 transition-colors hover:bg-ivory hover:text-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cocoa-900"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M5 12h14" strokeLinecap="round" />
                          </svg>
                        </button>
                        <span aria-live="polite" className="grid h-11 min-w-9 place-items-center border-x border-cream-300 px-1 text-sm font-bold tabular-nums text-cocoa-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.productName}`}
                          className="grid size-11 shrink-0 place-items-center text-cocoa-900 transition-colors hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cocoa-900"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <span className="ml-auto text-sm font-bold text-cocoa-900">
                        {formatMoney(item.unitPrice * item.quantity, c)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="shrink-0 border-t border-cream-300 bg-cream-100 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-cocoa-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-cocoa-900">{formatMoney(summary.subtotal, c)}</span>
                </div>
                {summary.discount > 0 && (
                  <div className="flex items-center justify-between text-cocoa-500">
                    <span>Discount</span>
                    <span className="font-semibold text-success">− {formatMoney(summary.discount, c)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-cream-300 pt-2.5">
                  <span className="font-display text-base font-semibold text-cocoa-900">Total</span>
                  <span className="font-display text-xl font-bold text-cocoa-900">
                    {formatMoney(summary.total, c)}
                  </span>
                </div>
                {summary.discount > 0 && (
                  <p className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-success">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    You save {formatMoney(summary.discount, c)} on this order
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  closeCart();
                  router.push('/checkout');
                }}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center flex-wrap gap-2 rounded-xl bg-cocoa-900 px-3 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900"
              >
                Proceed to Checkout
                <span className="font-bold text-gold-400">· {formatMoney(summary.total, c)}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
