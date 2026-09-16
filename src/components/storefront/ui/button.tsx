import type { ComponentPropsWithRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-[var(--dur-base)] ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cocoa-900 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-cocoa-900 text-ivory hover:bg-cocoa-950 active:bg-cocoa-950",
  secondary:
    "border border-terracotta-600/45 bg-transparent text-cocoa-800 hover:border-terracotta-600 hover:bg-cream-100 hover:text-cocoa-900",
  quiet:
    "text-terracotta-700 underline-offset-4 hover:text-cocoa-900 hover:underline",
};

/* Both sizes keep interactive targets at or above 44px. */
const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-11 px-6 text-sm",
  lg: "min-h-12 px-7 text-sm",
};

/**
 * Shared button styling as a class builder so Next.js `Link` elements can
 * carry the identical treatment without an asChild/Radix dependency.
 */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
