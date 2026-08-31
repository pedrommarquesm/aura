import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { disabledAuthResponse } from "@/lib/auth/disabled";
import { clearOnboardingCookie, readSessionCookies } from "@/lib/auth/cookies";
import { claimUsername } from "@/lib/auth/session";
import { normalizeUsername, usernameProblem } from "@/lib/auth/username";

export async function POST(request: Request) {
  const disabled = disabledAuthResponse();
  if (disabled) return disabled;

  const { accessToken } = await readSessionCookies();

  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not signed in" } },
      { status: 401 },
    );
  }

  let body: { username?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Expected JSON" } },
      { status: 400 },
    );
  }

  const username = normalizeUsername(body.username ?? "");
  const problem = usernameProblem(username);
  if (problem) {
    return NextResponse.json(
      { error: { code: "validation_failed", message: problem } },
      { status: 400 },
    );
  }

  try {
    const user = await claimUsername(accessToken, username);
    const jar = await cookies();
    clearOnboardingCookie(jar);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: { code: "internal_error", message: "Could not claim username" } },
      { status: 500 },
    );
  }
}
