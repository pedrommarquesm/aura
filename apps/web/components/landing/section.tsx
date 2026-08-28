import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-caption tracking-[0.18em] text-aura-bright uppercase">
      <span aria-hidden className="h-px w-6 bg-aura" />
      {children}
    </p>
  );
}

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-16 border-t border-border/70 py-20 sm:py-28",
        className,
      )}
    >
      <Container>
        <header className="flex max-w-2xl flex-col gap-4">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h2 className="text-title text-balance sm:text-display">{title}</h2>
          {description ? (
            <p className="text-body text-text-secondary">{description}</p>
          ) : null}
        </header>
        <div className="mt-12 sm:mt-16">{children}</div>
      </Container>
    </section>
  );
}
