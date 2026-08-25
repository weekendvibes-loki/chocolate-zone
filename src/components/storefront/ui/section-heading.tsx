import type { ReactNode } from "react";

export type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Trailing slot (e.g. a "View all" Link) rendered after the text block. */
  action?: ReactNode;
  align?: "start" | "center";
  /** Heading level; h2 keeps section semantics by default. */
  level?: 2 | 3;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "start",
  level = 2,
  className,
}: SectionHeadingProps) {
  const Heading: "h2" | "h3" = level === 3 ? "h3" : "h2";
  const isCenter = align === "center";

  return (
    <div
      className={[
        isCenter
          ? "flex flex-col items-center text-center"
          : "flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={isCenter ? "max-w-2xl" : "max-w-xl"}>
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-terracotta-700">
            {eyebrow}
          </span>
        )}
        <Heading className="mt-2 font-display text-3xl font-semibold tracking-tight text-cocoa-900 sm:text-4xl">
          {title}
        </Heading>
        {description && (
          <p className="mt-3 text-sm leading-6 text-cocoa-500">{description}</p>
        )}
      </div>
      {action && <div className={isCenter ? "mt-5" : "shrink-0"}>{action}</div>}
    </div>
  );
}
