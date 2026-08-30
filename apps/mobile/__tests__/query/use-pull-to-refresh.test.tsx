import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

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
    const api = { current: null as null | ReturnType<typeof usePullToRefresh> };

    function Probe() {
      const pull = usePullToRefresh(refetch);
      api.current = pull;
      return <Text testID="refreshing">{pull.refreshing ? 'yes' : 'no'}</Text>;
    }

    await render(<Probe />);
    expect(screen.getByTestId('refreshing')).toHaveTextContent('no');

    let pending!: Promise<void>;
    await act(async () => {
      pending = api.current!.onRefresh();
    });
    expect(screen.getByTestId('refreshing')).toHaveTextContent('yes');

    await act(async () => {
      finish();
      await pending;
    });
    expect(screen.getByTestId('refreshing')).toHaveTextContent('no');
  });

  it('clears the spinner if the refetch throws', async () => {
    const refetch = jest.fn(() => Promise.reject(new Error('offline')));
    const api = { current: null as null | ReturnType<typeof usePullToRefresh> };

    function Probe() {
      const pull = usePullToRefresh(refetch);
      api.current = pull;
      return <Text testID="refreshing">{pull.refreshing ? 'yes' : 'no'}</Text>;
    }

    await render(<Probe />);
    await act(async () => {
      await api.current!.onRefresh();
    });
    expect(screen.getByTestId('refreshing')).toHaveTextContent('no');
  });
});
