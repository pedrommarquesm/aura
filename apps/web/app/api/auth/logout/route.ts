import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import {
  clearSessionCookies,
  readSessionCookies,
} from "@/lib/auth/cookies";
import { revokeSession } from "@/lib/auth/session";

export async function POST() {
  const { accessToken } = await readSessionCookies();
  const jar = await cookies();

  try {
    if (accessToken) {
      await revokeSession(accessToken);
    }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) {
      clearSessionCookies(jar);
      return NextResponse.json(
        {
          error: {
            code: error instanceof ApiError ? error.code : "internal_error",
            message: error instanceof Error ? error.message : "Logout failed",
          },
        },
        { status: error instanceof ApiError ? error.status : 500 },
      );
    }
  }

  clearSessionCookies(jar);
  return new NextResponse(null, { status: 204 });
}
