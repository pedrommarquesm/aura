/**
 * Stable, machine-readable error codes.
 *
 * The mobile app branches on these strings, so treat them as a public API:
 * add freely, never rename or repurpose. HTTP status alone is not enough for
 * the client to tell "already liked" from "cannot like your own post".
 */
export const ErrorCode = {
  // Generic
  BAD_REQUEST: 'bad_request',
  VALIDATION_FAILED: 'validation_failed',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  INTERNAL: 'internal_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',

  // Auth
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  REFRESH_REUSE_DETECTED: 'refresh_reuse_detected',
  ACCOUNT_SUSPENDED: 'account_suspended',
  ACCOUNT_BANNED: 'account_banned',

  // Posts and uploads
  UPLOAD_EXPIRED: 'upload_expired',
  UPLOAD_TOO_LARGE: 'upload_too_large',
  UNSUPPORTED_MEDIA_TYPE: 'unsupported_media_type',
  POST_NOT_PUBLISHED: 'post_not_published',

  // Aura
  ALREADY_LIKED: 'already_liked',
  NOT_LIKED: 'not_liked',
  CANNOT_LIKE_OWN_POST: 'cannot_like_own_post',

  // Trust and safety
  ALREADY_REPORTED: 'already_reported',
  ALREADY_BLOCKED: 'already_blocked',
  CANNOT_BLOCK_SELF: 'cannot_block_self',
  CANNOT_REPORT_SELF: 'cannot_report_self',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
