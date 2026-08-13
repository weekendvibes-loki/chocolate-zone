'use client';

import Link from 'next/link';

export function StorefrontErrorState({
  title,
  description,
  backHref = '/',
  backLabel = 'Back to menu',
  retryLabel = 'Try again',
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7D5C1] bg-[#FFF7EA] px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[#F2B84B]/25 text-[#B3703D]">
        <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
        </svg>
      </span>
      <h1 className="mt-5 font-serif text-2xl font-semibold text-[#2A1710]">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#7A4E2D]">{description}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#2A1710] px-6 text-sm font-semibold text-[#F5E6D5] transition-colors hover:bg-[#1E100B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {retryLabel}
        </button>
        <Link
          href={backHref}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#E7D5C1] bg-white px-6 text-sm font-semibold text-[#2A1710] transition-colors hover:border-[#B3703D] hover:text-[#B3703D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
