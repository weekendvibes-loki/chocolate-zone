// Retain the name prop for existing callers; only the accessible description uses it.
export function ProductImageFallback({ name }: { name: string }) {
  return (
    <div
      role="img"
      aria-label={`Image unavailable for ${name}`}
      className="flex h-full w-full flex-col items-center justify-center gap-3 bg-cream-200/60 px-3 text-center"
    >
      <svg
        aria-hidden="true"
        className="size-10 text-terracotta-600/75"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M4 9h16M4 15h16M9.3 3v18M14.6 3v18" strokeLinecap="round" />
      </svg>
      <span aria-hidden="true" className="text-xs text-cocoa-500">
        Photo coming soon
      </span>
    </div>
  );
}
