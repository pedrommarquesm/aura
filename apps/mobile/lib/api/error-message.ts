import { ApiError, NetworkError, SessionExpiredError } from './errors';
import i18n from '@/lib/i18n/i18n';
import en from '@/locales/en.json';

/**
 * The error code is the translation boundary (docs/i18n.md §"API error codes"): the API
 * returns a stable machine code plus a developer-facing `message`, and the client is the
 * side that owns the copy the user reads. `error.message` is for logs only.
 */
type KnownErrorCode = keyof typeof en.errors;

// `hasOwnProperty`, not `in`: an error code of `constructor` or `toString` would
// otherwise look like a key we have copy for and render the key name.
function isKnown(code: string): code is KnownErrorCode {
  return Object.prototype.hasOwnProperty.call(en.errors, code);
}

/**
 * A newer API can return a code this build has never heard of, so an unknown code has to
 * degrade to something sayable rather than render `errors.some_new_code` on screen.
 */
export function messageForErrorCode(code: string): string {
  return i18n.t(isKnown(code) ? `errors.${code}` : 'errors.unknown');
}

/** Localized copy for anything the API client can throw. */
export function messageForError(error: unknown): string {
  if (error instanceof ApiError) return messageForErrorCode(error.code);
  if (error instanceof NetworkError) return i18n.t('errors.network');
  if (error instanceof SessionExpiredError) return i18n.t('errors.token_expired');

  return i18n.t('errors.unknown');
}
