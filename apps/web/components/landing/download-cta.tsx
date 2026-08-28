import { Container, Eyebrow } from "@/components/landing/section";
import { ButtonLink } from "@/components/ui";
import { siteConfig } from "@/lib/site";

export function DownloadCta() {
  return (
    <section id="download" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-xl border border-aura/40 bg-surface p-8 shadow-aura-glow sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,var(--color-aura-deep),transparent_60%)] opacity-70"
          />

          <div className="relative flex flex-col gap-6">
            <Eyebrow>Download</Eyebrow>

            <h2 className="max-w-2xl text-title text-balance sm:text-display">
              Zero Aura is a choice. Fix it in about ninety seconds.
            </h2>

            <p className="max-w-xl text-body text-text-secondary">
              Install the app, post once, and watch what the feed does with it.
              Free on iOS and Android, no invite needed.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={siteConfig.appStoreUrl} size="lg">
                Download for iPhone
              </ButtonLink>
              <ButtonLink
                href={siteConfig.playStoreUrl}
                size="lg"
                variant="secondary"
              >
                Download for Android
              </ButtonLink>
            </div>

            <p className="text-caption text-text-muted">
              Photos and videos, likes, Aura and the global leaderboard. Posting
              only happens in the app.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
