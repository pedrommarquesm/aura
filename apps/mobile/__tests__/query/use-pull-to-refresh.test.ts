import { act, renderHook } from '@testing-library/react-native';

import { usePullToRefresh } from '@/lib/query/use-pull-to-refresh';

describe('usePullToRefresh', () => {
  it('is refreshing only while the pull refetch is in flight', async () => {
    let finish!: (value?: unknown) => void;
    const refetch = jest.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    const { result } = renderHook(() => usePullToRefresh(refetch));
    expect(result.current.refreshing).toBe(false);

    let done!: Promise<void>;
    act(() => {
      done = result.current.onRefresh();
    });
    expect(result.current.refreshing).toBe(true);

    await act(async () => {
      finish();
      await done;
    });
    expect(result.current.refreshing).toBe(false);
  });

  it('clears the spinner if the refetch throws', async () => {
    const refetch = jest.fn(() => Promise.reject(new Error('offline')));
    const { result } = renderHook(() => usePullToRefresh(refetch));

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.refreshing).toBe(false);
  });
});
