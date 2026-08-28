"use client";

import { useRouter } from "@/i18n/navigation";

import { UsernameForm } from "@/components/auth/username-form";

export function UsernameClaimForm() {
  const router = useRouter();

  return (
    <UsernameForm
      onClaimed={() => {
        router.replace("/feed");
        router.refresh();
      }}
    />
  );
}
