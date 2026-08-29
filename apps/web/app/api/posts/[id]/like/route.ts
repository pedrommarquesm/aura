import { NextRequest, NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import type { LikeResult } from "@/lib/api/types";
import { upstream } from "@/lib/api/upstream";
import {
  clearSessionOnResponse,
  readSessionCookiesFromRequest,
} from "@/lib/auth/cookies";
import { isPostId } from "@/lib/likes/ids";

type RouteContext = { params: Promise<{ id: string }> };

function errorBody(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function handle(
  request: NextRequest,
  method: "POST" | "DELETE",
  context: RouteContext,
) {
  const { id } = await context.params;
  if (!isPostId(id)) {
    return errorBody("not_found", "Post not found", 404);
  }

  const { accessToken } = readSessionCookiesFromRequest(request);
  if (!accessToken) {
    return errorBody("unauthorized", "Not signed in", 401);
  }

  try {
    const result = await upstream<LikeResult>(
      `/v1/posts/${encodeURIComponent(id)}/like`,
      { method, accessToken },
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const response = errorBody("unauthorized", "Not signed in", 401);
      clearSessionOnResponse(response);
      return response;
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return errorBody("internal_error", "Could not update like", 500);
  }
}

export function POST(request: NextRequest, context: RouteContext) {
  return handle(request, "POST", context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, "DELETE", context);
}
