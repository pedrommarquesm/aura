import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';

import HomeScreen from '@/app/(tabs)/index';
import { queryKeys } from '@/lib/query/keys';

import { api, feedPage } from '../helpers/api';
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
    expect(screen.getAllByHintText('Like').length).toBeGreaterThan(0);
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

  it('does not spin the refresh control when the feed refetches in the background', async () => {
    const { queryClient, UNSAFE_getByType } = await renderApp(<HomeScreen />);
    expect(await screen.findByText('golden hour hits different when you are winning')).toBeOnTheScreen();

    api.fetchFeedPage.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.ranking('latest') });
    });

    expect(screen.getByText('golden hour hits different when you are winning')).toBeOnTheScreen();
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('spins the refresh control only when they pull', async () => {
    const { UNSAFE_getByType } = await renderApp(<HomeScreen />);
    expect(await screen.findByText('golden hour hits different when you are winning')).toBeOnTheScreen();

    let finish!: (value: unknown) => void;
    api.fetchFeedPage.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );

    await act(async () => {
      void UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);

    await act(async () => {
      finish(feedPage());
    });
    await waitFor(() => {
      expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
    });
  });

  it('asks them to sign in when they try to like — and does not award Aura', async () => {
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    const like = await screen.findAllByHintText('Like');

    await user.press(like[0]!);

    expect(await screen.findByText('Sign in to award Aura')).toBeOnTheScreen();
    expect(api.likePost).not.toHaveBeenCalled();
  });
});
