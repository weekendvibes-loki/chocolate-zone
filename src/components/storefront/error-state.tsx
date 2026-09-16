'use client';

import Link from 'next/link';
import { Button, buttonClass } from '@/components/storefront/ui/button';

export function StorefrontErrorState({
  title,
  description,
  backHref = '/',
  backLabel = 'Back to menu',
  retryLabel = 'Try again',
  onRetry,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-ivory px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-gold-400/25 text-terracotta-700">
        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
        </svg>
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold text-cocoa-900">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-cocoa-400">{description}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onRetry ?? (() => window.location.reload())} size="lg">
          {retryLabel}
        </Button>
        <Link
          href={backHref}
          className={buttonClass({ variant: 'secondary', size: 'lg' })}
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
