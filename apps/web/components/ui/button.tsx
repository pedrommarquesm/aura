import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow] duration-(--motion-quick) ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-aura-gradient text-text shadow-aura-glow-sm hover:brightness-110 hover:shadow-aura-glow",
  secondary:
    "border border-border bg-surface-elevated text-text hover:border-aura hover:bg-surface-elevated/80",
  ghost: "text-text-secondary hover:bg-surface-elevated hover:text-text",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-caption",
  md: "h-11 px-5 text-label",
  lg: "h-14 px-8 text-body font-bold",
};

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: Omit<SharedProps, "children"> = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: SharedProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: SharedProps & ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link className={buttonClassName({ variant, size, className })} {...props} />
  );
}
