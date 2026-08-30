import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import { mockFeed } from '@/mocks/feed';

import { api, feedPage } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asRestoring, asSignedIn } from '../helpers/session';

describe('Signed-in person likes a post', () => {
  beforeEach(() => {
    asSignedIn();
  });

  it('awards Aura and updates the count without asking them to sign in', async () => {
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    const like = await screen.findAllByHintText('Like');

    await user.press(like[0]!);

    await waitFor(() => {
      expect(api.likePost).toHaveBeenCalledWith('01j0000000000000000000001');
    });
    expect(screen.getByLabelText(/1,?285 likes/)).toBeTruthy();
    expect(screen.queryByText('Sign in to award Aura')).toBeNull();
  });

  it('does not fetch the feed until the session is restored', async () => {
    asRestoring();
    await renderApp(<HomeScreen />);

    expect(api.fetchFeedPage).not.toHaveBeenCalled();

    await act(async () => {
      asSignedIn();
    });

    expect(await screen.findByHintText('Remove like')).toBeOnTheScreen();
    expect(api.fetchFeedPage).toHaveBeenCalled();
  });

  it('refetches after sign-in so already-liked posts show a filled heart', async () => {
    asGuest();
    const guestPage = feedPage(
      mockFeed.map((post) => ({ ...post, likedByMe: false })),
    );
    const signedInPage = feedPage(mockFeed);
    api.fetchFeedPage.mockResolvedValue(guestPage);

    await renderApp(<HomeScreen />);
    await screen.findByText('absolute cinema');
    expect(screen.queryByHintText('Remove like')).toBeNull();

    api.fetchFeedPage.mockResolvedValue(signedInPage);
    await act(async () => {
      asSignedIn();
    });

    expect(await screen.findByHintText('Remove like')).toBeOnTheScreen();
  });
});
