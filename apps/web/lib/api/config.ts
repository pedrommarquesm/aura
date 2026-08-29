const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export const apiConfig = {
  baseUrl: (baseUrl && baseUrl.length > 0
    ? baseUrl
    : "https://api.aurarankd.com"
  ).replace(/\/$/, ""),
  /**
   * Hits the live API unless explicitly opted into mocks. Staging is the
   * default host so a local `npm run dev` without env still shows real data.
   */
  useMock: process.env.NEXT_PUBLIC_USE_MOCK_API === "true",
  /** Matches the trending cache window in architecture §8.4. */
  revalidateSeconds: 10,
  defaultLimit: 10,
  maxLimit: 20,
} as const;
