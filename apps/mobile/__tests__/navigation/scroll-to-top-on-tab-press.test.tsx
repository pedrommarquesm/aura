import { render } from '@testing-library/react-native';

import { emitFeedTabPress } from '@/lib/navigation/feed-tab';
import { useScrollToTopOnTabPress } from '@/lib/navigation/use-scroll-to-top-on-tab-press';

function Probe({ onScroll }: { onScroll: () => void }) {
  useScrollToTopOnTabPress(onScroll);
  return null;
}

describe('Tapping the Feed tab', () => {
  it('scrolls the feed back to the first post', async () => {
    const onScroll = jest.fn();
    await render(<Probe onScroll={onScroll} />);

    emitFeedTabPress();

    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});
