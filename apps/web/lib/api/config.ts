const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export const apiConfig = {
  baseUrl: (baseUrl && baseUrl.length > 0
    ? baseUrl
    : "https://api.aura.app"
  ).replace(/\/$/, ""),
  /**
   * There is no backend yet, so mocks are the default. Set
   * `NEXT_PUBLIC_USE_MOCK_API=false` once the API is reachable.
   */
  useMock: process.env.NEXT_PUBLIC_USE_MOCK_API !== "false",
  /** Matches the trending cache window in architecture §8.4. */
  revalidateSeconds: 10,
  defaultLimit: 10,
  maxLimit: 20,
} as const;
