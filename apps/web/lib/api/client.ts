import { apiConfig } from "./config";
import { ApiError } from "./errors";
import type { CursorParams } from "./types";

type RequestOptions = {
  query?: Record<string, string | number | null | undefined>;
  /** Overrides the default trending-window revalidation. */
  revalidate?: number | false;
};

function buildUrl(path: string, query: RequestOptions["query"]) {
  const url = new URL(`${apiConfig.baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return new ApiError(
      response.status,
      body.error?.code ?? "unknown_error",
      body.error?.message ?? response.statusText,
    );
  } catch {
    return new ApiError(response.status, "unknown_error", response.statusText);
  }
}

/**
 * The only place the app talks to the network. Reads are anonymous by design:
 * web has no session in V0, so there is no Authorization header to attach.
 */
export async function apiGet<T>(
  path: string,
  { query, revalidate = apiConfig.revalidateSeconds }: RequestOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    headers: { accept: "application/json" },
    next: revalidate === false ? { revalidate: false } : { revalidate },
  });

  if (!response.ok) {
    throw await readError(response);
  }

  return (await response.json()) as T;
}

export function cursorQuery({ cursor, limit }: CursorParams = {}) {
  return {
    cursor,
    limit: Math.min(limit ?? apiConfig.defaultLimit, apiConfig.maxLimit),
  };
}
