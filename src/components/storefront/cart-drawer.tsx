'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/pricing/money';
import { EmptyState } from '@/components/admin/empty-state';
import { useCart } from '@/components/storefront/cart-context';

export function CartDrawer() {
  const { items, currency, summary, isOpen, closeCart, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  const c = currency ?? 'INR';

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping cart"
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCart}
        className={`absolute inset-0 bg-zinc-900/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-bold text-zinc-900">Your Cart</h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid size-9 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <EmptyState
              title="Your cart is empty"
              description="Add a few treats and they'll show up here."
            />
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.productName} fill sizes="64px" className="object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-zinc-300">
                        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <path d="M3 10h18M3 14h18M8 5v4M16 5v4" strokeLinecap="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{item.productName}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.key)}
                        aria-label={`Remove ${item.productName} from cart`}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    {item.variantLabel && <p className="mt-0.5 text-xs text-zinc-500">{item.variantLabel}</p>}
                    <p className="mt-0.5 text-xs text-zinc-500">{formatMoney(item.unitPrice, c)} each</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#E7D5C1] bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            item.quantity > 1 ? updateQuantity(item.key, item.quantity - 1) : removeItem(item.key)
                          }
                          aria-label="Decrease quantity"
                          className="grid size-9 place-items-center text-[#B3703D] transition-colors hover:bg-[#FFF7EA] hover:text-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M5 12h14" strokeLinecap="round" />
                          </svg>
                        </button>
                        <span className="w-9 text-center text-sm font-bold text-[#2A1710]">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="grid size-9 place-items-center text-[#2A1710] transition-colors hover:bg-[#FFF7EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500"
                        >
                          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                      <span className="ml-auto text-sm font-bold text-[#2A1710]">
                        {formatMoney(item.unitPrice * item.quantity, c)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-zinc-200 bg-[#FFF7EA]/60 px-5 py-4">
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-zinc-900">{formatMoney(summary.subtotal, c)}</span>
                </div>
                {summary.discount > 0 && (
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Discount</span>
                    <span className="font-semibold text-emerald-600">− {formatMoney(summary.discount, c)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-[#E7D5C1] pt-2.5">
                  <span className="font-serif text-base font-semibold text-[#2A1710]">Total</span>
                  <span className="font-serif text-xl font-bold text-[#2A1710]">
                    {formatMoney(summary.total, c)}
                  </span>
                </div>
                {summary.discount > 0 && (
                  <p className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-emerald-600">
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
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2A1710] px-6 py-3 text-sm font-semibold text-[#F5E6D5] transition-colors hover:bg-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Proceed to Checkout
                <span className="font-bold text-[#F2B84B]">· {formatMoney(summary.total, c)}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
