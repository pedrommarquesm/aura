"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/error-message";
import { normalizeUsername, usernameProblem } from "@/lib/auth/username";

export function UsernameForm({
  onClaimed,
}: {
  onClaimed: () => void;
}) {
  const t = useTranslations("auth.username");
  const errors = useTranslations("errors");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const problem = value.length > 0 ? usernameProblem(value) : null;
  const error =
    problem === "invalid"
      ? t("invalid")
      : problem === "reserved"
        ? t("reserved")
        : serverError;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const username = normalizeUsername(value);
    if (usernameProblem(username)) return;

    setBusy(true);
    setServerError(null);

    try {
      const response = await fetch("/api/auth/username", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (response.status === 409) {
        setServerError(t("taken"));
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as {
          error?: { code?: string };
        };
        setServerError(apiErrorMessage(errors, payload.error?.code ?? "unknown"));
        return;
      }

      onClaimed();
    } catch {
      setServerError(errors("unknown"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
      <label className="flex flex-col gap-2">
        <span className="text-label">{t("placeholder")}</span>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setServerError(null);
          }}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={30}
          disabled={busy}
          className="h-11 rounded-md border border-border bg-surface-elevated px-4 text-body text-text outline-none transition-[border-color,box-shadow] duration-(--motion-quick) ease-out focus:border-aura focus:shadow-aura-glow-sm"
        />
      </label>

      {value.length > 0 || serverError ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={busy || usernameProblem(normalizeUsername(value)) !== null}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
