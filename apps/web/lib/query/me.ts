import type { PublicUser } from "@/lib/api/types";

export type MeSnapshot = {
  user: PublicUser;
  needsUsername: boolean;
};

export async function fetchMe(): Promise<MeSnapshot | null> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return null;
  const payload = (await response.json()) as
    | MeSnapshot
    | { error: { code: string } };
  if (payload && "user" in payload) return payload;
  return null;
}
