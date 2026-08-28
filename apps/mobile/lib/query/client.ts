import { QueryClient } from '@tanstack/react-query';

import { isRetryable } from '@/lib/api';

const MAX_RETRIES = 2;

/**
 * Feed-shaped defaults.
 *
 * `staleTime` is generous because a feed page is a snapshot, not live data — refetching
 * it while the user is mid-scroll would reorder content under their thumb. Mutations
 * (like/unlike) update the cache optimistically instead, so freshness comes from the
 * write path rather than from polling.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        retry: (failureCount, error) => failureCount < MAX_RETRIES && isRetryable(error),
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        // A remount mid-session should render cached content instantly, not a spinner.
        refetchOnMount: false,
        refetchOnReconnect: true,
      },
      mutations: {
        // Aura actions are optimistic and idempotent server-side; a blind retry would
        // fight the rollback, so failures surface to the caller instead.
        retry: 0,
      },
    },
  });
}
