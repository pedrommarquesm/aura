"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { buttonClassName } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { PublicUser } from "@/lib/api/types";

type MeResponse =
  | { user: PublicUser; needsUsername: boolean }
  | { error: { code: string } };

export function SessionMenu() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as MeResponse;
      })
      .then((payload) => {
        if (cancelled) return;
        if (payload && "user" in payload) {
          setUser(payload.user);
          setNeedsUsername(payload.needsUsername);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setNeedsUsername(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (user === undefined) {
    return <span className="h-9 w-20 rounded-full bg-surface-elevated" />;
  }

  if (!user) {
    return (
      <Link href="/login" className={buttonClassName({ size: "sm" })}>
        {t("signIn")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={needsUsername ? "/username" : "/feed"}
        className="hidden max-w-[10rem] truncate text-label text-text-secondary transition-colors duration-(--motion-quick) ease-out hover:text-text sm:block"
      >
        @{user.username}
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => void signOut()}
        className={buttonClassName({ variant: "ghost", size: "sm" })}
      >
        {t("signOut")}
      </button>
    </div>
  );
}
