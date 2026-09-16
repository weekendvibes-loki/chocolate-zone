'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? { toast: () => {} };
}

export function ToastProvider({ children, appearance = 'admin' }: { children: ReactNode; appearance?: 'admin' | 'storefront' }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (appearance !== 'storefront') return;
    const viewport = viewportRef.current;
    const shell = viewport?.closest<HTMLElement>('.storefront-shell');
    if (!viewport || !shell) return;
    const observer = new ResizeObserver(() => {
      shell.style.setProperty('--storefront-toast-height', `${viewport.getBoundingClientRect().height}px`);
    });
    observer.observe(viewport);
    return () => {
      observer.disconnect();
      shell.style.removeProperty('--storefront-toast-height');
    };
  }, [appearance]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, message: string) => {
      // Re-adding an identical toast (e.g. rapid "Added to cart" clicks) refreshes
      // it instead of stacking a second snackbar, so the feedback never doubles up.
      const id = ++nextId.current;
      setToasts((prev) => [
        ...prev.filter((t) => !(t.kind === kind && t.message === message)),
        { id, kind, message },
      ]);
      window.setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div ref={viewportRef} className={appearance === 'storefront'
        ? 'storefront-toasts pointer-events-none fixed inset-x-0 z-[80] flex w-full flex-col items-center gap-2 px-4 lg:items-end lg:pr-6'
        : 'pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex w-full flex-col items-center gap-2 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:items-end lg:pb-6 lg:pr-6'}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            data-storefront-toast={appearance === 'storefront' ? '' : undefined}
            className={appearance === 'storefront'
              ? `pointer-events-auto flex w-full max-w-sm animate-[toast-in_0.3s_ease-out] items-center gap-3 rounded-2xl border bg-cocoa-900 py-2 pl-4 pr-2 text-ivory shadow-lg motion-reduce:animate-none ${t.kind === 'success' ? 'border-gold-400/40' : 'border-danger'}`
              : `pointer-events-auto flex w-full max-w-sm animate-[toast-in_0.3s_ease-out] items-start gap-3 rounded-2xl border border-white/10 bg-[#2A1710]/95 px-4 py-3 text-[#F5E6D5] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl ${
              t.kind === 'success' ? 'border-[#F2B84B]/40' : 'border-red-500/40'
            }`}
          >
            <span
              className={appearance === 'storefront'
                ? `grid size-5 shrink-0 place-items-center rounded-full ${t.kind === 'success' ? 'bg-gold-400 text-cocoa-950' : 'bg-danger text-ivory'}`
                : `mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                t.kind === 'success' ? 'bg-[#F2B84B] text-[#1E100B]' : 'bg-red-500/90 text-white'
              }`}
            >
              {t.kind === 'success' ? (
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <p className={appearance === 'storefront' ? 'min-w-0 flex-1 text-sm text-ivory' : 'flex-1 text-sm text-[#F5E6D5]'}>{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className={appearance === 'storefront'
                ? 'grid size-11 shrink-0 place-items-center rounded-lg text-cream-200 transition-colors hover:bg-ivory/10 hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400'
                : 'text-[#E7D5C1]/60 transition-colors hover:text-[#F2B84B]'}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
