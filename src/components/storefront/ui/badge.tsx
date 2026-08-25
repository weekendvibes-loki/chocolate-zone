import type { ComponentProps } from "react";

export type BadgeVariant = "offer" | "neutral" | "success" | "danger";

/*
 * Gold is used only as a badge background with cocoa text (high contrast) —
 * never as text on a light surface.
 */
const variantClasses: Record<BadgeVariant, string> = {
  offer: "bg-gold-400 text-cocoa-900",
  neutral: "border border-cream-300 bg-cream-100 text-cocoa-500",
  success: "bg-success text-ivory",
  danger: "bg-danger text-ivory",
};

export type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
