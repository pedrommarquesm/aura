import { getLocale, getTranslations } from "next-intl/server";

import { ArrowRightIcon } from "@/components/icons";
import { DemoFeedPost, PhoneFrame } from "@/components/landing/demo-feed-post";
import { DEMO_POSTS } from "@/lib/demo-posts";
import { Container } from "@/components/landing/section";
import { buttonClassName } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { sectionHash } from "@/i18n/sections";

export async function Hero() {
  const locale = await getLocale();
  const t = await getTranslations("landing.hero");
  const actions = await getTranslations("common.actions");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_15%_-10%,var(--color-aura-deep),transparent_60%),radial-gradient(50%_50%_at_95%_10%,var(--color-aura),transparent_65%)] opacity-45"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-aura-gradient opacity-60"
      />

      <Container className="grid gap-16 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10 lg:pt-28 lg:pb-28">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-caption text-text-secondary backdrop-blur-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {t("badge")}
          </p>

          <h1 className="mt-6 text-display tracking-tight text-balance sm:text-[3.5rem] sm:leading-[1.05] lg:text-[4.25rem]">
            {t.rich("title", {
              break: () => <br />,
              accent: (chunks) => (
                <span className="text-aura-gradient">{chunks}</span>
              ),
            })}
          </h1>

          <p className="mt-6 max-w-xl text-body text-text-secondary">{t("body")}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={{ pathname: "/", hash: sectionHash(locale, "join").slice(1) }}
              className={buttonClassName({ size: "lg" })}
            >
              {actions("joinEarly")}
            </Link>
            <Link
              href={{ pathname: "/", hash: sectionHash(locale, "play").slice(1) }}
              className={buttonClassName({ size: "lg", variant: "secondary" })}
            >
              {actions("seeHowItWorks")}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <HeroPhone />
        </div>
      </Container>
    </section>
  );
}

function HeroPhone() {
  return (
    <PhoneFrame>
      <DemoFeedPost post={DEMO_POSTS[0]!} />
    </PhoneFrame>
  );
}
