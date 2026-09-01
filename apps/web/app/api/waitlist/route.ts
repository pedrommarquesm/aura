import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { upstream } from "@/lib/api/upstream";
import type { WaitlistPublic } from "@/lib/waitlist";

export async function POST(request: Request) {
  let body: { email?: string; username?: string; referralCode?: string; locale?: string };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Expected JSON" } },
      { status: 400 },
    );
  }

  try {
    const result = await upstream<WaitlistPublic>("/v1/waitlist", {
      method: "POST",
      body: {
        email: body.email,
        username: body.username,
        referralCode: body.referralCode ?? null,
        locale: body.locale ?? null,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: { code: "internal_error", message: "Could not join the waitlist" } },
      { status: 500 },
    );
  }
}
