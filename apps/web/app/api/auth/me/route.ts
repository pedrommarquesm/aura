import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import {
  clearSessionCookies,
  readSessionCookies,
} from "@/lib/auth/cookies";
import { fetchMe } from "@/lib/auth/session";

export async function GET() {
  const { accessToken, needsUsername } = await readSessionCookies();

  if (!accessToken) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Not signed in" } },
      { status: 401 },
    );
  }

  try {
    const user = await fetchMe(accessToken);
    return NextResponse.json({ user, needsUsername });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const jar = await cookies();
      clearSessionCookies(jar);
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Not signed in" } },
        { status: 401 },
      );
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: { code: "internal_error", message: "Could not load session" } },
      { status: 500 },
    );
  }
}
