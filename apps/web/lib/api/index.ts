import { apiConfig } from "./config";
import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { AuraApi } from "./types";

/**
 * The seam. Everything in the app imports `api` from here. The live API is the
 * default; set `NEXT_PUBLIC_USE_MOCK_API=true` to render local posters instead.
 */
export const api: AuraApi = apiConfig.useMock ? mockApi : httpApi;

export { apiConfig } from "./config";
export {
  API_ERROR_CODES,
  type ApiErrorCode,
  apiErrorMessage,
} from "./error-message";
export { ApiError } from "./errors";
export type * from "./types";
