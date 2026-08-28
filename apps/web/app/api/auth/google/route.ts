import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { signInWithGoogle } from "@/lib/auth/session";
import { writeSessionCookies } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  let body: { identityToken?: string; nonce?: string; locale?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Expected JSON" } },
      { status: 400 },
    );
  }

  if (!body.identityToken) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "identityToken is required" } },
      { status: 400 },
    );
  }

  try {
    const result = await signInWithGoogle(
      body.identityToken,
      body.nonce,
      body.locale,
    );
    const jar = await cookies();
    writeSessionCookies(jar, result, result.needsUsername);

    return NextResponse.json({
      user: result.user,
      needsUsername: result.needsUsername,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: { code: "internal_error", message: "Google sign-in failed" } },
      { status: 500 },
    );
  }
}
