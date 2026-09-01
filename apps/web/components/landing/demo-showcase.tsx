import { getLocale, getTranslations } from "next-intl/server";

import { DragHandIcon, FilterIcon } from "@/components/icons";
import { Container } from "@/components/landing/section";
import { Avatar } from "@/components/ui";
import { sectionId } from "@/i18n/sections";
import { cn } from "@/lib/cn";

type Receipt = { username: string; body: string };
type LedgerEntry = Receipt & { amount: string };

function amountTone(amount: string): string {
  if (amount.startsWith("+")) return "text-aura";
  if (amount.startsWith("-")) return "text-danger";
  return "text-text-muted";
}

/**
 * Marketing preview of the three surfaces the app is built on. Static —
 * illustrative content, not a live demo. Matches the mobile app's palette
 * (docs/design-tokens.md) even though the reference screenshot for this page
 * was not pixel-accurate to it.
 */
export async function DemoShowcase() {
  const locale = await getLocale();
  const t = await getTranslations("landing.demo");

  const liveCheckReceipts = t.raw("liveCheck.receipts") as Receipt[];
  const ledgerEntries = t.raw("ledger.entries") as LedgerEntry[];

  return (
    <section className="border-t border-border/70 py-16 sm:py-20">
      <Container>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Live Check */}
          <div
            id={sectionId(locale, "liveCheck")}
            className="scroll-mt-16 relative flex aspect-[9/13] flex-col justify-between overflow-hidden border border-border bg-[linear-gradient(160deg,var(--color-surface-elevated)_0%,var(--color-bg)_55%,black_100%)] p-3"
          >
            <span className="inline-flex w-fit items-center gap-1.5 border border-border bg-bg/80 px-2 py-1 text-caption tracking-wide text-text-secondary uppercase">
              <span aria-hidden className="size-1.5 rounded-full bg-danger" />
              {t("liveCheck.badge")}
            </span>

            <div className="absolute top-3 right-4 bottom-14 flex w-1 flex-col items-center justify-center bg-border/60">
              <span
                aria-hidden
                className="h-7 w-3 -translate-x-1 bg-aura shadow-[0_0_16px_var(--color-aura)]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              {liveCheckReceipts.map((receipt) => (
                <p
                  key={receipt.username}
                  className="max-w-[85%] border border-border bg-bg/85 px-2 py-1.5 text-caption text-text-secondary"
                >
                  <span className="font-semibold text-text">@{receipt.username}</span>{" "}
                  {receipt.body}
                </p>
              ))}
              <p className="aura-numerals text-title font-black text-aura">
                {t("liveCheck.aura")}
              </p>
            </div>
          </div>

          {/* The Slider */}
          <div
            id={sectionId(locale, "slider")}
            className="scroll-mt-16 relative flex aspect-[9/13] flex-col items-center justify-center gap-4 border border-border bg-bg p-3"
          >
            <p className="aura-numerals text-display font-black text-aura">
              {t("slider.value")}
            </p>

            <div className="absolute inset-y-6 right-6 w-1 bg-border">
              <span
                aria-hidden
                className="absolute top-1/3 h-8 w-3 -translate-x-1 bg-aura shadow-[0_0_16px_var(--color-aura)]"
              />
            </div>

            <div className="mt-6 flex items-center gap-2 text-caption text-text-muted">
              <DragHandIcon className="size-4" />
              <span>{t("slider.hint")}</span>
            </div>
          </div>

          {/* The Ledger */}
          <div
            id={sectionId(locale, "ledger")}
            className="scroll-mt-16 flex aspect-[9/13] flex-col border border-border bg-surface"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-label tracking-wide text-text uppercase">
                {t("ledger.title")}
              </p>
              <FilterIcon className="size-4 text-text-secondary" />
            </div>
            <div className="flex flex-1 flex-col divide-y divide-border overflow-hidden">
              {ledgerEntries.map((entry) => (
                <div key={entry.username} className="flex items-start gap-2.5 p-3">
                  <Avatar
                    username={entry.username}
                    size="sm"
                    className="rounded-none"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-caption font-semibold text-text">
                      @{entry.username}
                    </p>
                    <p className="text-caption text-text-secondary">{entry.body}</p>
                  </div>
                  <span
                    className={cn(
                      "aura-numerals shrink-0 border border-border px-1.5 py-0.5 text-caption font-bold",
                      amountTone(entry.amount),
                    )}
                  >
                    {entry.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
