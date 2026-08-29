import { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { readSessionCookiesFromRequest } from "@/lib/auth/cookies";
import { readFeedPage, readTrendingPage } from "@/lib/query/load";

function errorBody(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Client pagination / refetch. Reads the JWT from the request Cookie header
 * so `cookies()` from `next/headers` never runs — that call makes Next
 * refresh the page after the fetch, which jumps the feed to the top.
 */
export async function GET(request: NextRequest) {
  const ranking = request.nextUrl.searchParams.get("ranking");
  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 6);
  const { accessToken } = readSessionCookiesFromRequest(request);

  try {
    const page =
      ranking === "trending"
        ? await readTrendingPage(Number.isFinite(limit) ? limit : 6, accessToken)
        : await readFeedPage(cursor, accessToken);
    return NextResponse.json(page);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return errorBody("internal_error", "Could not load the feed", 500);
  }
}
