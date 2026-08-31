import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { upstream } from "@/lib/api/upstream";

export async function POST(request: Request) {
  let body: {
    name?: string;
    email?: string;
    message?: string;
    locale?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad_request", message: "Expected JSON" } },
      { status: 400 },
    );
  }

  try {
    const result = await upstream<{ ok: true }>("/v1/contact", {
      method: "POST",
      body: {
        name: body.name,
        email: body.email,
        message: body.message,
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
      { error: { code: "internal_error", message: "Could not send that message" } },
      { status: 500 },
    );
  }
}
