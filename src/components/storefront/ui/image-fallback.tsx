export type ImageFallbackContext = "product" | "offer" | "category";

function ContextIcon({ context }: { context: ImageFallbackContext }) {
  const iconProps = {
    className: "size-8",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    "aria-hidden": true,
  } as const;

  if (context === "offer") {
    return (
      <svg {...iconProps}>
        <path
          d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V5a2 2 0 0 1 2-2h8l7.6 7.6a2 2 0 0 1 0 2.8Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7.5" cy="7.5" r="1" />
      </svg>
    );
  }

  if (context === "category") {
    return (
      <svg {...iconProps}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path
          d="M3 10h18M3 14h18M8 5v4M16 5v4"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  /* product: segmented cocoa tablet */
  return (
    <svg {...iconProps}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path
        d="M4 9h16M4 15h16M9.3 3v18M14.6 3v18"
        strokeLinecap="round"
      />
    </svg>
  );
}

export type ImageFallbackProps = {
  /** Visible label rendered inside the tile in both modes. */
  label: string;
  context?: ImageFallbackContext;
  /**
   * Defaults to true: every planned consumer renders the product, offer, or
   * category name as adjacent text, so the tile is purely decorative and
   * hidden from assistive technology (`aria-hidden`). Set to false only for
   * standalone use — the root then exposes itself as a single image
   * (`role="img"`) named by `label`, and the visible label is concealed from
   * the accessibility tree so the name is not announced twice.
   */
  decorative?: boolean;
  className?: string;
};

/**
 * Premium cream/ivory placeholder for products without photography.
 * Renders absolutely, filling the nearest `relative` aspect-ratio container
 * (the pattern used by every storefront image frame). The icon and divider
 * are always decorative.
 */
export function ImageFallback({
  label,
  context = "product",
  decorative = true,
  className,
}: ImageFallbackProps) {
  const accessibilityProps = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label } as const);

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-cream-100 via-ivory to-cream-200 p-6 text-center ${className ?? ""}`}
      {...accessibilityProps}
    >
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full border border-terracotta-600/25 bg-white/70 text-terracotta-600"
      >
        <ContextIcon context={context} />
      </span>
      <span
        aria-hidden="true"
        className="h-px w-10 bg-gradient-to-r from-transparent via-gold-400 to-transparent"
      />
      <span
        aria-hidden="true"
        className="font-display text-base font-semibold leading-snug text-cocoa-800"
      >
        {label}
      </span>
    </div>
  );
}
