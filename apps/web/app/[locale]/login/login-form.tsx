"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { destinationAfterAuth } from "@/lib/auth/continue-after-auth";

export function LoginForm({ next }: { next: string | null }) {
  const locale = useLocale();
  const router = useRouter();

  const onSignedIn = useCallback(
    ({ needsUsername }: { needsUsername: boolean }) => {
      void destinationAfterAuth({ locale, needsUsername, next }).then((href) => {
        router.replace(href);
        router.refresh();
      });
    },
    [locale, next, router],
  );

  return <GoogleSignInButton onSignedIn={onSignedIn} />;
}
