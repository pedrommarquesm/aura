"use client";

import { useCallback } from "react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { useRouter } from "@/i18n/navigation";

export function LoginForm() {
  const router = useRouter();

  const onSignedIn = useCallback(
    ({ needsUsername }: { needsUsername: boolean }) => {
      router.replace(needsUsername ? "/username" : "/feed");
      router.refresh();
    },
    [router],
  );

  return <GoogleSignInButton onSignedIn={onSignedIn} />;
}
