import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import { queryKeys } from '@/lib/query/keys';

import { api } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest } from '../helpers/session';

describe('Guest browses the feed', () => {
  beforeEach(() => {
    asGuest();
  });

  it('shows Latest and Trending and the posts people shared', async () => {
    await renderApp(<HomeScreen />);

    expect(await screen.findByText('Latest')).toBeTruthy();
    expect(screen.getByText('Trending')).toBeTruthy();
    expect(await screen.findByText('golden hour hits different when you are winning')).toBeTruthy();
    expect(screen.getByText('absolute cinema')).toBeTruthy();
  });

  it('loads Trending when they switch the chip', async () => {
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    await user.press(screen.getByRole('tab', { name: 'Trending' }));

    await waitFor(() => {
      expect(api.fetchFeedPage).toHaveBeenCalledWith('trending', null, expect.anything());
    });
  });

  it('keeps the posts on screen while the feed refetches', async () => {
    const { queryClient } = await renderApp(<HomeScreen />);
    expect(
      await screen.findByText('golden hour hits different when you are winning'),
    ).toBeOnTheScreen();

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.ranking('latest') });
    });

    expect(screen.getByText('golden hour hits different when you are winning')).toBeOnTheScreen();
  });
});
