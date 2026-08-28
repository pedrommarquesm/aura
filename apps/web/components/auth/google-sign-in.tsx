"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { GOOGLE_WEB_CLIENT_ID, isGoogleConfigured } from "@/lib/auth/google";
import { apiErrorMessage } from "@/lib/api/error-message";
import { cn } from "@/lib/cn";

type GoogleCredentialResponse = {
  credential: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            nonce?: string;
            ux_mode?: "popup" | "redirect";
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            config: {
              theme?: "outline" | "filled_black" | "filled_blue";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill";
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

function createNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function GoogleSignInButton({
  onSignedIn,
}: {
  onSignedIn: (result: { needsUsername: boolean }) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const errors = useTranslations("errors");
  const hostRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef(createNonce());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!isGoogleConfigured()) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError(errors("service_unavailable"));
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [errors]);

  useEffect(() => {
    if (!scriptReady || !isGoogleConfigured()) return;
    const host = hostRef.current;
    if (!host || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      nonce: nonceRef.current,
      ux_mode: "popup",
      auto_select: false,
      callback: async (response) => {
        setBusy(true);
        setError(null);

        try {
          const result = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              identityToken: response.credential,
              nonce: nonceRef.current,
              locale,
            }),
          });

          const payload = (await result.json()) as {
            needsUsername?: boolean;
            error?: { code?: string };
          };

          if (!result.ok) {
            setError(apiErrorMessage(errors, payload.error?.code ?? "unknown"));
            return;
          }

          onSignedIn({ needsUsername: Boolean(payload.needsUsername) });
        } catch {
          setError(errors("unknown"));
        } finally {
          setBusy(false);
        }
      },
    });

    host.replaceChildren();
    window.google.accounts.id.renderButton(host, {
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: 320,
      locale: locale === "pt" ? "pt-PT" : "en",
    });
  }, [errors, locale, onSignedIn, scriptReady]);

  if (!isGoogleConfigured()) {
    return <p className="text-caption text-text-muted">{t("unavailable.google")}</p>;
  }

  return (
    <div className="flex flex-col items-stretch gap-3">
      <div
        ref={hostRef}
        className={cn(
          "flex min-h-11 justify-center",
          busy && "pointer-events-none opacity-60",
        )}
      />
      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
