"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/auth/session-context";
import { buttonClassName } from "@/components/ui";
import { Link } from "@/i18n/navigation";

export function SessionMenu() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { status, user, needsUsername, clear } = useSession();

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clear();
    router.refresh();
  };

  if (status === "loading") {
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
        onClick={() => void signOut()}
        className={buttonClassName({ variant: "ghost", size: "sm" })}
      >
        {t("signOut")}
      </button>
    </div>
  );
}
