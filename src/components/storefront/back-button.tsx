'use client';

import { useRouter } from 'next/navigation';

export function BackButton({ label = 'Back' }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back to the previous page"
      className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#B3703D]/30 bg-white/90 py-2 pl-2.5 pr-4 text-sm font-semibold text-[#B3703D] shadow-sm backdrop-blur transition-colors hover:border-[#B3703D]/60 hover:bg-[#B3703D]/10 hover:text-[#8A5A2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B3703D]/60 lg:hidden"
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19 12H5m6-7-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
