import { apiConfig } from "./config";
import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { AuraApi } from "./types";

/**
 * The seam. Everything in the app imports `api` from here, so pointing web at
 * the real backend is this one line plus `NEXT_PUBLIC_USE_MOCK_API=false`.
 */
export const api: AuraApi = apiConfig.useMock ? mockApi : httpApi;

export { apiConfig } from "./config";
export { ApiError } from "./errors";
export type * from "./types";
