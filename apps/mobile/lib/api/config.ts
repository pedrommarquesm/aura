/**
 * The API lives on staging until a local docker-compose stack is running.
 * Override with `EXPO_PUBLIC_API_URL` — include the `/v1` prefix.
 */
const DEFAULT_BASE_URL = 'https://api.auraclimb.com/v1';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/,
  '',
);

/** Deliberately short: §27 treats a slow feed as a broken feed. */
export const REQUEST_TIMEOUT_MS = 10_000;

export const IS_API_CONFIGURED = true;
