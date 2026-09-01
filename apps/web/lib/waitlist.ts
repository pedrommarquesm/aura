import { ApiError } from "@/lib/api/errors";

export type WaitlistPublic = {
  username: string;
  referralCode: string;
  aura: number;
  referralCount: number;
  alreadyJoined: boolean;
  referralUrl: string;
  awardedAura: number;
};

export async function joinWaitlist(input: {
  email: string;
  username: string;
  referralCode?: string | null;
  locale: string;
}): Promise<WaitlistPublic> {
  const response = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as
    | WaitlistPublic
    | { error?: { code?: string; message?: string } };

  if (!response.ok) {
    const error = "error" in payload ? payload.error : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? "unknown",
      error?.message ?? "Join failed",
    );
  }

  return payload as WaitlistPublic;
}

export async function submitContact(input: {
  name: string;
  email: string;
  message: string;
  locale: string;
}): Promise<void> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    throw new ApiError(
      response.status,
      payload.error?.code ?? "unknown",
      payload.error?.message ?? "Send failed",
    );
  }
}
