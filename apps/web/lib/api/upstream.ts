import { apiConfig } from "./config";
import { ApiError } from "./errors";

type UpstreamOptions = {
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string | number | null | undefined>;
  body?: unknown;
  accessToken?: string | null;
};

function buildUrl(
  path: string,
  query: UpstreamOptions["query"],
) {
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
 * Uncached fetch to the Aura API. Used by the BFF session routes and by
 * signed-in page loads. Never Next-cache these: they carry a user token.
 */
export async function upstream<T>(
  path: string,
  { method = "GET", query, body, accessToken }: UpstreamOptions = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await readError(response);
  }

  return (await response.json()) as T;
}
