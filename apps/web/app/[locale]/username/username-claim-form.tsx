"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import { UsernameForm } from "@/components/auth/username-form";
import { destinationAfterAuth } from "@/lib/auth/continue-after-auth";

export function UsernameClaimForm({ next }: { next: string | null }) {
  const locale = useLocale();
  const router = useRouter();

  return (
    <UsernameForm
      onClaimed={() => {
        void destinationAfterAuth({
          locale,
          needsUsername: false,
          next,
        }).then((href) => {
          router.replace(href);
          router.refresh();
        });
      }}
    />
  );
}
