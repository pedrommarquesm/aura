import type { ReactNode } from "react";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main>
        <Container className="flex max-w-3xl flex-col py-16 sm:py-24">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 text-title text-balance sm:text-display">{title}</h1>
          <div className="mt-10 flex flex-col gap-8 text-body text-text-secondary [&_h2]:text-heading [&_h2]:text-text [&_p]:max-w-2xl [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
            {children}
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
