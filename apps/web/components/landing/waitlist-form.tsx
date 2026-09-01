"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";

import { apiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/errors";
import { sectionHash } from "@/i18n/sections";
import type { AppLocale } from "@/i18n/routing";
import { JOIN_AURA, REFERRAL_AURA, REF_QUERY, REF_STORAGE_KEY, readReferralCode } from "@/lib/launch";
import { joinWaitlist, type WaitlistPublic } from "@/lib/waitlist";

/** Same rule as the app's username claim screen (docs/redesign-tracker.md). */
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export function WaitlistForm() {
  const locale = useLocale();
  const t = useTranslations("landing.waitlist");
  const errors = useTranslations("errors");
  const search = useSearchParams();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaitlistPublic | null>(null);
  const [copied, setCopied] = useState(false);
  const fromUrl = readReferralCode(search.get(REF_QUERY));
  const fromStorage = useSyncExternalStore(
    () => () => {},
    () => readReferralCode(sessionStorage.getItem(REF_STORAGE_KEY)),
    () => null,
  );
  const referralCode = fromUrl ?? fromStorage;

  useEffect(() => {
    if (fromUrl) sessionStorage.setItem(REF_STORAGE_KEY, fromUrl);
  }, [fromUrl]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const cleanUsername = username.trim().replace(/^@/, "");
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setError(errors("validation_failed"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const joined = await joinWaitlist({
        email,
        username: cleanUsername,
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
      <div className="relative overflow-hidden border border-aura bg-surface p-6 sm:p-8">
        <div className="relative flex flex-col gap-4">
          <p className="text-caption tracking-[0.18em] text-aura uppercase">
            {result.alreadyJoined ? t("success.againEyebrow") : t("success.eyebrow")}
          </p>
          <h3 className="text-title text-balance">
            {result.alreadyJoined
              ? t("success.againTitle", { username: result.username })
              : t("success.title", { username: result.username })}
          </h3>
          <p className="text-body text-text-secondary">
            {result.alreadyJoined
              ? t("success.againBody", { aura: result.aura })
              : t("success.body", { aura: JOIN_AURA, referral: REFERRAL_AURA })}
          </p>
          <p className="aura-numerals text-display text-aura">
            {t("success.score", { aura: result.aura })}
          </p>
          {result.referralCount > 0 ? (
            <p className="text-label text-text-secondary">
              {t("success.referrals", { count: result.referralCount })}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 truncate border border-border bg-bg px-4 py-3 text-caption text-text-secondary">
              {result.referralUrl}
            </code>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="h-12 shrink-0 border border-text bg-text px-6 text-label font-bold tracking-wide text-bg uppercase transition-colors duration-(--motion-quick) ease-out hover:bg-aura hover:border-aura"
            >
              {copied ? t("success.copied") : t("success.copy")}
            </button>
          </div>
          <p className="text-caption text-text-muted">{t("success.shareHint")}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      method="post"
      action={sectionHash(locale as AppLocale, "join")}
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-3"
    >
      {referralCode ? (
        <p className="border border-aura/40 bg-surface px-4 py-3 text-label text-text-secondary">
          {t("invited")}
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">{t("usernameLabel")}</span>
        <input
          type="text"
          name="username"
          required
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={t("usernamePlaceholder")}
          className="h-14 border border-border bg-surface px-5 text-body text-text outline-none transition-colors duration-(--motion-quick) ease-out placeholder:text-text-muted focus:border-aura"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="sr-only">{t("emailLabel")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("emailPlaceholder")}
          className="h-14 border border-border bg-surface px-5 text-body text-text outline-none transition-colors duration-(--motion-quick) ease-out placeholder:text-text-muted focus:border-aura"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-1 h-14 border border-text bg-text text-label font-bold tracking-wide text-bg uppercase transition-colors duration-(--motion-quick) ease-out hover:bg-aura hover:border-aura disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? t("submitting") : t("submit")}
      </button>
      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">{t("finePrint", { referral: REFERRAL_AURA })}</p>
    </form>
  );
}
