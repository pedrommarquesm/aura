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
    const like = await screen.findAllByHintText('Give aura');

    await user.press(like[0]!);

    await waitFor(() => {
      expect(api.likePost).toHaveBeenCalledWith('01j0000000000000000000001');
    });
    expect(screen.getAllByLabelText(/1,?285 auras/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Sign in to award Aura')).toBeNull();
  });

  it('does not fetch the feed until the session is restored', async () => {
    asRestoring();
    await renderApp(<HomeScreen />);

    expect(api.fetchFeedPage).not.toHaveBeenCalled();

    await act(async () => {
      asSignedIn();
    });

    expect((await screen.findAllByHintText('Remove aura')).length).toBeGreaterThan(0);
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
    expect(screen.queryAllByHintText('Remove aura')).toHaveLength(0);

    api.fetchFeedPage.mockResolvedValue(signedInPage);
    await act(async () => {
      asSignedIn();
    });

    expect((await screen.findAllByHintText('Remove aura')).length).toBeGreaterThan(0);
  });
});
