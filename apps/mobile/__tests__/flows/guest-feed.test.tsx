import { screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';

import { api } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest } from '../helpers/session';

describe('Guest browses the feed', () => {
  beforeEach(() => {
    asGuest();
  });

  it('shows Latest and Trending and the posts people shared', async () => {
    renderApp(<HomeScreen />);

    expect(await screen.findByRole('tab', { name: 'Latest' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Trending' })).toBeOnTheScreen();
    expect(
      await screen.findByText('golden hour hits different when you are winning'),
    ).toBeOnTheScreen();
    expect(screen.getByText('absolute cinema')).toBeOnTheScreen();
    expect(screen.getAllByHintText('Like').length).toBeGreaterThan(0);
  });

  it('loads Trending when they switch the chip', async () => {
    const user = userEvent.setup();
    renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    await user.press(screen.getByRole('tab', { name: 'Trending' }));

    await waitFor(() => {
      expect(api.fetchFeedPage).toHaveBeenCalledWith('trending', null, expect.anything());
    });
  });

  it('asks them to sign in when they try to like — and does not award Aura', async () => {
    const user = userEvent.setup();
    renderApp(<HomeScreen />);
    const like = await screen.findAllByHintText('Like');

    await user.press(like[0]!);

    expect(await screen.findByText('Sign in to award Aura')).toBeOnTheScreen();
    expect(api.likePost).not.toHaveBeenCalled();
  });
});
