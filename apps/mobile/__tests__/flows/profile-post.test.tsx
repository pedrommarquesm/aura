import { act, fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import ProfileScreen from '@/app/(tabs)/profile';
import PostScreen from '@/app/post/[id]';

import { api, feedPage, ownPost } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asSignedIn, routerMocks } from '../helpers/session';

describe('Profile post view and post menu', () => {
  it('opens a post from the profile grid', async () => {
    asSignedIn();
    api.fetchUserPosts.mockResolvedValue(feedPage([ownPost()]));
    const user = userEvent.setup();
    await renderApp(<ProfileScreen />);

    await user.press(await screen.findByLabelText('my golden hour'));

    expect(routerMocks().push).toHaveBeenCalledWith('/post/post-own');
  });

  it('hides the post menu when signed out', async () => {
    asGuest();
    await renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');
    expect(screen.queryByLabelText('Post options')).toBeNull();
  });

  it("hides the post menu on other people's posts", async () => {
    asSignedIn();
    await renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');
    expect(screen.queryByLabelText('Post options')).toBeNull();
  });

  it('lets the author edit the caption', async () => {
    asSignedIn();
    const post = ownPost();
    api.fetchFeedPage.mockResolvedValue(feedPage([post]));
    api.updatePostCaption.mockResolvedValue({ ...post, caption: 'new words' });
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);

    await user.press(await screen.findByLabelText('Post options'));
    await user.press(screen.getByLabelText('Edit'));

    expect(screen.getByText('Edit caption')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Caption'), 'new words');
    await user.press(screen.getByLabelText('Save'));

    await waitFor(() => {
      expect(api.updatePostCaption).toHaveBeenCalledWith('post-own', 'new words');
    });
    expect(await screen.findByText('new words')).toBeOnTheScreen();
    expect(screen.queryByText('my golden hour')).toBeNull();
  });

  it('lets the author delete a post from the post screen', async () => {
    asSignedIn();
    const post = ownPost();
    routerMocks().params = { id: post.id };
    api.fetchPost.mockResolvedValue(post);
    api.deletePost.mockResolvedValue({ postId: post.id, status: 'removed' });
    const user = userEvent.setup();
    await renderApp(<PostScreen />);

    expect(await screen.findByText('my golden hour')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Post options'));
    await user.press(screen.getByLabelText('Delete'));

    expect(screen.getByText('Delete this post?')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Delete'));

    await waitFor(() => {
      expect(api.deletePost).toHaveBeenCalledWith('post-own');
    });
    expect(routerMocks().back).toHaveBeenCalled();
  });

  it('pulls to refresh the profile', async () => {
    asSignedIn();
    await renderApp(<ProfileScreen />);
    await screen.findByText('@tester');

    api.fetchPublicProfile.mockClear();
    api.fetchUserPosts.mockClear();
    await act(async () => {
      fireEvent(screen.getByTestId('profile-scroll').children[0] as never, 'refresh');
    });
    await waitFor(() => {
      expect(api.fetchPublicProfile).toHaveBeenCalled();
      expect(api.fetchUserPosts).toHaveBeenCalled();
    });
  });
});
