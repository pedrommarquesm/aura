import { apiConfig } from "./config";
import { AdminApiError, type ApiErrorBody } from "./types";

export async function adminFetch<T>(
  path: string,
  options: {
    accessToken: string;
    method?: string;
    body?: unknown;
    query?: Record<string, string | number | undefined>;
  },
): Promise<T> {
  const url = new URL(`${apiConfig.publicBaseUrl}${path}`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    let code = "internal_error";
    let message = response.statusText;

    try {
      const payload = (await response.json()) as ApiErrorBody;
      code = payload.error?.code ?? code;
      message = payload.error?.message ?? message;
    } catch {
      // Keep status text.
    }

    throw new AdminApiError(code, message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
