// Branded placeholder for products without an uploaded image.
// Premium light chocolate-boutique treatment: cream/ivory base with a subtle
// cocoa tonal wash, soft terracotta and gold accents and a refined chocolate
// tablet motif. Presentation only — no generated imagery, no fake product
// photography. Fills its parent (aspect ratio comes from the surrounding image
// frame), so there is no layout shift.

export function ProductImageFallback({ name }: { name: string }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden bg-[#FFF7EA] px-4 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,#FFFDF8_0%,#F7EEDD_55%,#F1E3CC_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-[#B3703D]/[0.08]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-10 size-32 rounded-full border border-[#F2B84B]/35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 bottom-8 hidden size-3 rotate-45 bg-[#2A1710]/10 sm:block"
      />
      <svg
        aria-hidden="true"
        className="relative size-10 text-[#B3703D]/75"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M2 10h20M2 16h20M9 4v12M15 4v12" strokeLinecap="round" />
      </svg>
      <span className="relative line-clamp-2 font-serif text-base font-semibold leading-snug text-[#2A1710]">
        {name}
      </span>
      <span className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B3703D]/85">
        Handcrafted
      </span>
    </div>
  );
}
