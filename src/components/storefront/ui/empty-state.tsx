import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Optional call to action (e.g. a Button or Link) under the text. */
  action?: ReactNode;
  /** Optional decorative motif; concealed from assistive tech. */
  icon?: ReactNode;
  className?: string;
};

/**
 * Storefront empty state. Plain semantic markup — the visible title and
 * description carry the content, so no extra ARIA is needed. Rendered as
 * `<p>` rather than a heading to avoid disrupting the page's heading order.
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-cream-100/70 px-6 py-12 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-full bg-gold-400/20 text-terracotta-600"
        >
          {icon}
        </span>
      )}
      <p
        className={[
          "font-display text-lg font-semibold text-cocoa-900",
          icon ? "mt-4" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {title}
      </p>
      {description && (
        <p className="mt-1.5 max-w-xs text-sm leading-6 text-cocoa-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
