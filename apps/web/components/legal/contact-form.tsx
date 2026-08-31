"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/errors";
import { submitContact } from "@/lib/waitlist";

export function ContactForm() {
  const locale = useLocale();
  const t = useTranslations("legal.contact");
  const errors = useTranslations("errors");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitContact({ name, email, message, locale });
      setSent(true);
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

  if (sent) {
    return (
      <p className="rounded-lg border border-aura/30 bg-surface px-5 py-6 text-body text-text-secondary">
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex max-w-lg flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-caption text-text-secondary">{t("name")}</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-12 rounded-full border border-border bg-surface px-5 text-body outline-none focus:border-aura"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-caption text-text-secondary">{t("email")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-full border border-border bg-surface px-5 text-body outline-none focus:border-aura"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-caption text-text-secondary">{t("message")}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="rounded-xl border border-border bg-surface px-5 py-3 text-body outline-none focus:border-aura"
        />
      </label>
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? t("sending") : t("submit")}
      </Button>
      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">{t("note")}</p>
    </form>
  );
}
