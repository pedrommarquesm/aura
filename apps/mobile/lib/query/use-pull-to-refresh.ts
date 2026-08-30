import { useCallback, useState } from 'react';

/**
 * Native RefreshControl's spinner must only appear when the user pulls.
 * TanStack Query `isRefetching` is also true for focus, reconnect, and
 * invalidate — those should update the list in place, not flash the globe.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [refetch]);

  return { refreshing: pullRefreshing, onRefresh };
}
