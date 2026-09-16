'use client';

import { useRouter } from 'next/navigation';

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back to the previous page"
      className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-cream-300 bg-cream-100 py-2 pl-2.5 pr-4 text-sm font-semibold text-terracotta-700 transition-colors hover:border-terracotta-600 hover:text-cocoa-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 lg:hidden"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19 12H5m6-7-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
