import type { useTranslations } from "next-intl";

/**
 * Mirror of `apps/api/src/common/errors/error-codes.ts`. The API is
 * locale-agnostic: it returns a stable code and the client renders the copy, so
 * adding a language needs no backend deploy (docs/i18n.md).
 *
 * Keep this list and the `errors.*` namespace in step — the catalog is typed,
 * so a missing message fails the typecheck.
 */
export const API_ERROR_CODES = [
  "bad_request",
  "validation_failed",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "internal_error",
  "service_unavailable",
  "invalid_token",
  "token_expired",
  "refresh_reuse_detected",
  "account_suspended",
  "account_banned",
  "upload_expired",
  "upload_too_large",
  "unsupported_media_type",
  "post_not_published",
  "already_liked",
  "not_liked",
  "cannot_like_own_post",
  "already_reported",
  "already_blocked",
  "cannot_block_self",
  "cannot_report_self",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

type ErrorTranslator = ReturnType<typeof useTranslations<"errors">>;

function isApiErrorCode(code: string): code is ApiErrorCode {
  return (API_ERROR_CODES as ReadonlyArray<string>).includes(code);
}

/**
 * Translates an API error code. A newer API can return a code this build has
 * never heard of, so anything unrecognized falls back rather than leaking
 * `error.message`, which is for developers and logs only.
 *
 * ```tsx
 * const t = useTranslations("errors");
 * const message = apiErrorMessage(t, error.code);
 * ```
 */
export function apiErrorMessage(t: ErrorTranslator, code: string) {
  return isApiErrorCode(code) ? t(code) : t("unknown");
}
