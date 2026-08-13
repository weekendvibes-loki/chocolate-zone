// Branded placeholder for products without an uploaded image.
// Cocoa/cream treatment with a subtle chocolate-tablet motif. Presentation
// only — no generated imagery, no fake product photography. Fills its parent
// (aspect ratio comes from the surrounding image frame), so there is no
// layout shift.

export function ProductImageFallback({ name }: { name: string }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden bg-[#2A1710] px-4 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_60%_at_50%_0%,rgba(179,112,61,0.4),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-12 size-36 rounded-full border border-[#F2B84B]/20"
      />
      <svg
        aria-hidden="true"
        className="relative size-11 text-[#F2B84B]/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M2 10h20M2 16h20M9 4v12M15 4v12" strokeLinecap="round" />
      </svg>
      <span className="relative line-clamp-2 font-serif text-base font-semibold leading-snug text-[#FFF7EA]">
        {name}
      </span>
      <span className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F2B84B]/70">
        Handcrafted
      </span>
    </div>
  );
}
