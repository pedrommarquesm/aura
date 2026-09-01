import { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import { readSessionCookiesFromRequest } from "@/lib/auth/cookies";
import { isPostId } from "@/lib/api/ids";
import { readPostById } from "@/lib/query/load";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isPostId(id)) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Post not found" } },
      { status: 404 },
    );
  }

  const { accessToken } = readSessionCookiesFromRequest(request);

  try {
    const post = await readPostById(id, accessToken);
    if (!post) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Post not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: { code: "internal_error", message: "Could not load the post" } },
      { status: 500 },
    );
  }
}
