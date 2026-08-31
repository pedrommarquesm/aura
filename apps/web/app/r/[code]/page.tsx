import { redirect } from "next/navigation";

import { readReferralCode } from "@/lib/launch";

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const referral = readReferralCode(code);
  redirect(referral ? `/?ref=${referral}` : "/");
}

export function generateStaticParams() {
  return [] as Array<{ code: string }>;
}

/** Short share URLs are unprefixed, same as /a/:username/post/:id. */
export const dynamic = "force-dynamic";
