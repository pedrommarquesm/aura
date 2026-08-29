import { apiConfig } from "./config";
import { AdminApiError, type StaffSignInResponse, type TokenResponse } from "./types";

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiConfig.serverBaseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    let code = "unauthorized";
    let message = "Staff sign-in failed";

    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      code = payload.error?.code ?? code;
      message = payload.error?.message ?? message;
    } catch {
      // The envelope is best-effort. Status is enough to fail the login.
    }

    throw new AdminApiError(code, message, response.status);
  }

  return (await response.json()) as T;
}

/**
 * NextAuth is a thin client of the API. Google only proves the email; the
 * API decides whether that person is staff and issues our tokens.
 */
export function staffSignInWithGoogle(identityToken: string): Promise<StaffSignInResponse> {
  return post<StaffSignInResponse>("/v1/staff/auth/google", {
    identityToken,
    device: { platform: "web", appVersion: "0.1.0" },
  });
}

export function staffRefresh(refreshToken: string): Promise<TokenResponse> {
  return post<TokenResponse>("/v1/staff/auth/refresh", { refreshToken });
}
