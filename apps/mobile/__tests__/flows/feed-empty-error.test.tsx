import { screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';

import { api, feedPage } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest } from '../helpers/session';

describe('Feed when there is nothing — or the load fails', () => {
  beforeEach(() => {
    asGuest();
  });

  it('tells them the feed is empty', async () => {
    api.fetchFeedPage.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    await renderApp(<HomeScreen />);

    expect(await screen.findByText('Nothing here yet')).toBeOnTheScreen();
  });

  it('shows an error and Try again brings the posts back', async () => {
    api.fetchFeedPage.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);

    expect(await screen.findByText('Could not load the feed')).toBeOnTheScreen();
    api.fetchFeedPage.mockResolvedValue(feedPage());

    await user.press(screen.getByLabelText('Try again'));

    await waitFor(() => {
      expect(screen.getByText('golden hour hits different when you are winning')).toBeOnTheScreen();
    });
  });
});
