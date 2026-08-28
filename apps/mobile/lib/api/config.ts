/**
 * The API does not exist yet (roadmap `API-01`). Until it does, this host is a
 * deliberate placeholder: requests against it fail, which is why the feed reads
 * from `mocks/` instead of the network. Set `EXPO_PUBLIC_API_URL` to point at a
 * real deployment — see `.env.example`.
 */
const PLACEHOLDER_BASE_URL = 'https://api.aura.app/v1';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? PLACEHOLDER_BASE_URL).replace(
  /\/+$/,
  '',
);

/** Deliberately short: §27 treats a slow feed as a broken feed. */
export const REQUEST_TIMEOUT_MS = 10_000;

export const IS_API_CONFIGURED = process.env.EXPO_PUBLIC_API_URL != null;
