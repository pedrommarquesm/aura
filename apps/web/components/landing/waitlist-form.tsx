"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/errors";
import { JOIN_AURA, REFERRAL_AURA, REF_QUERY, REF_STORAGE_KEY, readReferralCode } from "@/lib/launch";
import { joinWaitlist, type WaitlistPublic } from "@/lib/waitlist";

export function WaitlistForm() {
  const locale = useLocale();
  const t = useTranslations("landing.waitlist");
  const errors = useTranslations("errors");
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaitlistPublic | null>(null);
  const [copied, setCopied] = useState(false);
  const fromUrl = readReferralCode(search.get(REF_QUERY));
  const [fromStorage] = useState(() =>
    typeof window === "undefined"
      ? null
      : readReferralCode(sessionStorage.getItem(REF_STORAGE_KEY)),
  );
  const referralCode = fromUrl ?? fromStorage;

  useEffect(() => {
    if (fromUrl) sessionStorage.setItem(REF_STORAGE_KEY, fromUrl);
  }, [fromUrl]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const joined = await joinWaitlist({
        email,
        referralCode,
        locale,
      });
      setResult(joined);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? apiErrorMessage(errors, cause.code)
          : errors("unknown"),
      );
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.referralUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (result) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-aura/40 bg-surface p-6 shadow-aura-glow sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,var(--color-aura-deep),transparent_60%)] opacity-70"
        />
        <div className="relative flex flex-col gap-4">
          <p className="text-caption tracking-[0.18em] text-aura-bright uppercase">
            {result.alreadyJoined ? t("success.againEyebrow") : t("success.eyebrow")}
          </p>
          <h3 className="text-title text-balance">
            {result.alreadyJoined ? t("success.againTitle") : t("success.title")}
          </h3>
          <p className="text-body text-text-secondary">
            {result.alreadyJoined
              ? t("success.againBody", { aura: result.aura })
              : t("success.body", { aura: JOIN_AURA, referral: REFERRAL_AURA })}
          </p>
          <p className="aura-numerals text-display text-aura-gradient">
            {t("success.score", { aura: result.aura })}
          </p>
          {result.referralCount > 0 ? (
            <p className="text-label text-text-secondary">
              {t("success.referrals", { count: result.referralCount })}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 truncate rounded-full border border-border bg-bg px-4 py-3 text-caption text-text-secondary">
              {result.referralUrl}
            </code>
            <Button type="button" onClick={() => void copyLink()}>
              {copied ? t("success.copied") : t("success.copy")}
            </Button>
          </div>
          <p className="text-caption text-text-muted">{t("success.shareHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      {referralCode ? (
        <p className="rounded-lg border border-aura/30 bg-surface px-4 py-3 text-label text-text-secondary">
          {t("invited")}
        </p>
      ) : null}
      <label className="flex flex-col gap-2">
        <span className="text-caption text-text-secondary">{t("emailLabel")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("emailPlaceholder")}
          className="h-14 rounded-full border border-border bg-surface px-5 text-body text-text outline-none transition-colors duration-(--motion-quick) ease-out placeholder:text-text-muted focus:border-aura"
        />
      </label>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? t("submitting") : t("submit")}
      </Button>
      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">{t("finePrint")}</p>
    </form>
  );
}
