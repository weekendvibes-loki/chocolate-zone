'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toOfferRule } from '@/lib/services/mappers';
import { cartDiscount } from '@/lib/pricing/discount';
import type { Offer } from '@/types/domain';

export interface CartItem {
  key: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  variantIds: string[];
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  offer: Offer | null;
}

export interface AddItemInput {
  productId: string;
  productName: string;
  imageUrl: string | null;
  variantIds: string[];
  variantLabel: string | null;
  unitPrice: number;
  offer: Offer | null;
  currency: string;
}

export interface CartSummary {
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
}

interface CartContextValue {
  items: CartItem[];
  currency: string | null;
  summary: CartSummary;
  isOpen: boolean;
  addItem: (input: AddItemInput) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const STORAGE_KEY = 'storefront-cart';

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

interface PersistedCart {
  currency: string | null;
  items: CartItem[];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currency, setCurrency] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Defer the restore out of the synchronous effect body: the initial render
    // stays empty (matching the server), and only after hydration is the
    // persisted cart applied. `hydrated` flips in the same deferred step, so
    // the persistence effect never overwrites storage with the empty state.
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedCart;
          if (parsed && Array.isArray(parsed.items)) {
            setItems(parsed.items);
            if (typeof parsed.currency === 'string') setCurrency(parsed.currency);
          }
        }
      } catch {
        // Ignore malformed or unavailable storage.
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: PersistedCart = { currency, items };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota / availability errors.
    }
  }, [currency, hydrated, items]);

  const addItem = useCallback((input: AddItemInput) => {
    const variantKey = [...input.variantIds].sort().join('+');
    const key = variantKey ? `${input.productId}::${variantKey}` : input.productId;
    setCurrency(input.currency);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      const item: CartItem = {
        key,
        productId: input.productId,
        productName: input.productName,
        imageUrl: input.imageUrl,
        variantIds: input.variantIds,
        variantLabel: input.variantLabel,
        unitPrice: input.unitPrice,
        quantity: 1,
        offer: input.offer,
      };
      return [...prev, item];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i)));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const summary = useMemo<CartSummary>(() => {
    let itemCount = 0;
    let subtotal = 0;
    for (const item of items) {
      itemCount += item.quantity;
      subtotal += item.unitPrice * item.quantity;
    }
    const discount = cartDiscount(
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        offer: item.offer ? toOfferRule(item.offer) : null,
      })),
    );
    return { itemCount, subtotal, discount, total: subtotal - discount };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      currency,
      summary,
      isOpen,
      addItem,
      updateQuantity,
      removeItem,
      clear,
      openCart,
      closeCart,
    }),
    [items, currency, summary, isOpen, addItem, updateQuantity, removeItem, clear, openCart, closeCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
