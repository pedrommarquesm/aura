import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export function Skeleton({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-elevated",
        className,
      )}
      {...props}
    />
  );
}
