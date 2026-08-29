import { QueryClient } from "@tanstack/react-query";

import { isRetryable } from "@/lib/api/retry";

const MAX_RETRIES = 2;

/**
 * Feed-shaped defaults, same idea as mobile.
 *
 * A feed page is a snapshot. Mutations (like/unlike) write the cache, so we
 * do not refetch under the user. `staleTime` keeps a remount instant.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        retry: (failureCount, error) =>
          failureCount < MAX_RETRIES && isRetryable(error),
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        refetchOnMount: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
