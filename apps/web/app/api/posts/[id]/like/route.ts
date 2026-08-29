import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api/errors";
import type { LikeResult } from "@/lib/api/types";
import { upstream } from "@/lib/api/upstream";
import { clearSessionCookies, readSessionCookies } from "@/lib/auth/cookies";
import { isPostId } from "@/lib/likes/ids";

type RouteContext = { params: Promise<{ id: string }> };

function errorBody(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function handle(method: "POST" | "DELETE", context: RouteContext) {
  const { id } = await context.params;
  if (!isPostId(id)) {
    return errorBody("not_found", "Post not found", 404);
  }

  const { accessToken } = await readSessionCookies();
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
      const jar = await cookies();
      clearSessionCookies(jar);
      return errorBody("unauthorized", "Not signed in", 401);
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

export function POST(_request: Request, context: RouteContext) {
  return handle("POST", context);
}

export function DELETE(_request: Request, context: RouteContext) {
  return handle("DELETE", context);
}
