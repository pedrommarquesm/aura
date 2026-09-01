import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/landing/section";
import { WaitlistForm } from "@/components/landing/waitlist-form";

export async function Hero() {
  const t = await getTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden border-b border-border/70">
      <Container className="flex flex-col items-center gap-8 py-16 text-center sm:py-24">
        <p className="animate-rise inline-flex items-center border border-border px-3 py-1.5 text-caption tracking-[0.18em] text-text-secondary uppercase">
          {t("badge")}
        </p>

        <h1 className="animate-rise max-w-3xl text-display leading-[0.95] font-black tracking-tight text-balance uppercase sm:text-[4rem]">
          {t.rich("title", { break: () => <br /> })}
        </h1>

        <p className="animate-rise max-w-xl text-body text-text-secondary [animation-delay:80ms]">
          {t("body")}
        </p>

        <div className="animate-rise w-full max-w-md [animation-delay:140ms]">
          <Suspense
            fallback={<div className="h-64 border border-border bg-surface" />}
          >
            <WaitlistForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
