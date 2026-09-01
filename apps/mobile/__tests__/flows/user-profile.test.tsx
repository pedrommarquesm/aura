import { screen, userEvent } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import UserProfileScreen from '@/app/user/[username]';
import { mockFeed } from '@/mocks/feed';

import { api, feedPage, ownPost, profileFor, testUser } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asSignedIn, routerMocks } from '../helpers/session';

const alice = mockFeed[0]!;

describe("Other people's profiles", () => {
  it('opens their profile from the post avatar and name', async () => {
    asGuest();
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    const header = screen.getAllByLabelText('View @alice')[0]!;
    await user.press(header);

    expect(routerMocks().push).toHaveBeenCalledWith('/user/alice');
  });

  it('opens their profile from the author overlay on the card', async () => {
    asGuest();
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    const handles = screen.getAllByLabelText('View @alice');
    expect(handles.length).toBe(1);
    await user.press(handles[0]!);

    expect(routerMocks().push).toHaveBeenCalledWith('/user/alice');
  });

  it('sends you to your own Profile tab when the post is yours', async () => {
    asSignedIn();
    api.fetchFeedPage.mockResolvedValue(feedPage([ownPost()]));
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);

    await screen.findByText('my golden hour');
    await user.press(screen.getAllByLabelText('View @tester')[0]!);

    expect(routerMocks().push).toHaveBeenCalledWith('/(tabs)/profile');
  });

  it('shows their Aura and posts, and opens a post from the grid', async () => {
    asGuest();
    routerMocks().params = { username: 'alice' };
    api.fetchPublicProfile.mockResolvedValue(
      profileFor({
        ...testUser,
        id: alice.author.id,
        username: 'alice',
        displayName: null,
        aura: alice.author.aura,
        title: alice.author.title,
      }),
    );
    api.fetchUserPosts.mockResolvedValue(feedPage([alice]));
    const user = userEvent.setup();
    await renderApp(<UserProfileScreen />);

    expect(await screen.findByText('Aura Lord')).toBeOnTheScreen();
    expect(screen.getAllByText('@alice').length).toBeGreaterThan(0);
    expect(
      await screen.findByLabelText('golden hour hits different when you are winning'),
    ).toBeOnTheScreen();

    await user.press(screen.getByLabelText('golden hour hits different when you are winning'));

    expect(routerMocks().push).toHaveBeenCalledWith(`/post/${alice.id}`);
  });
});
