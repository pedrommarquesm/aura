import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';

import HomeScreen from '@/app/(tabs)/index';
import PostScreen from '@/app/post/[id]';
import { mockFeed } from '@/mocks/feed';

import { api, commentsPage, createdComment, ownPost, sampleComment } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asSignedIn, routerMocks } from '../helpers/session';

describe('Comments on a post', () => {
  it('opens the post when they tap the comment icon on the feed', async () => {
    asSignedIn();
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    await user.press(screen.getAllByHintText('Comment')[0]!);

    expect(routerMocks().push).toHaveBeenCalledWith('/post/01j0000000000000000000001');
  });

  it('lets a signed-in person comment on someone else\'s post', async () => {
    asSignedIn();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });
    api.fetchComments.mockResolvedValue(commentsPage());
    api.createComment.mockResolvedValue(createdComment('absolute cinema', 1));
    const user = userEvent.setup();
    await renderApp(<PostScreen />);

    expect(await screen.findByText('golden hour hits different when you are winning')).toBeOnTheScreen();
    expect(screen.getByText('No comments yet. Say something.')).toBeOnTheScreen();
    expect(screen.getByLabelText('0 comments')).toBeOnTheScreen();

    await user.type(screen.getByTestId('comment-body'), 'absolute cinema');
    await user.press(screen.getByTestId('comment-submit'));

    await waitFor(() => {
      expect(api.createComment).toHaveBeenCalledWith(mockFeed[0]!.id, 'absolute cinema');
    });
    expect(await screen.findByText('absolute cinema')).toBeOnTheScreen();
    expect(screen.queryByText('No comments yet. Say something.')).toBeNull();
    expect(await screen.findByLabelText('1 comment')).toBeOnTheScreen();
  });

  it('lets the author comment on their own post', async () => {
    asSignedIn();
    const post = ownPost();
    routerMocks().params = { id: post.id };
    api.fetchPost.mockResolvedValue(post);
    api.fetchComments.mockResolvedValue(commentsPage());
    api.createComment.mockResolvedValue(createdComment('my own note', 1));
    const user = userEvent.setup();
    await renderApp(<PostScreen />);

    await screen.findByText('my golden hour');
    await user.type(screen.getByTestId('comment-body'), 'my own note');
    await user.press(screen.getByTestId('comment-submit'));

    await waitFor(() => {
      expect(api.createComment).toHaveBeenCalledWith('post-own', 'my own note');
    });
    expect(await screen.findByText('my own note')).toBeOnTheScreen();
  });

  it('shows comments that are already there', async () => {
    asGuest();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });
    api.fetchComments.mockResolvedValue(
      commentsPage([
        sampleComment({
          id: 'c-joao',
          body: 'deserved',
          author: {
            id: 'u-joao',
            username: 'joao',
            displayName: null,
            avatarUrl: null,
            aura: 79_301,
            title: 'Aura Lord',
          },
        }),
      ]),
    );
    await renderApp(<PostScreen />);

    expect(await screen.findByText('deserved')).toBeOnTheScreen();
    expect(screen.getByText('@joao')).toBeOnTheScreen();
  });

  it('asks a guest to sign in when they try to write a comment', async () => {
    asGuest();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });
    const user = userEvent.setup();
    await renderApp(<PostScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    await user.press(screen.getByTestId('comment-submit'));

    expect(await screen.findByText('Sign in to comment')).toBeOnTheScreen();
    expect(api.createComment).not.toHaveBeenCalled();
  });

  it('skeletons comments on first load and does not spin the refresh control', async () => {
    asGuest();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });
    api.fetchComments.mockImplementation(() => new Promise(() => {}));

    const { UNSAFE_getByType } = await renderApp(<PostScreen />);

    expect(await screen.findByText('golden hour hits different when you are winning')).toBeOnTheScreen();
    expect(screen.getByTestId('comment-thread-skeleton')).toBeOnTheScreen();
    expect(screen.queryByText('No comments yet. Say something.')).toBeNull();
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('does not show the refresh spinner when focus invalidates the thread', async () => {
    asGuest();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });

    let commentsCalls = 0;
    api.fetchComments.mockImplementation(() => {
      commentsCalls += 1;
      if (commentsCalls === 1) {
        return Promise.resolve(
          commentsPage([sampleComment({ id: 'c-stay', body: 'deserved' })]),
        );
      }
      return new Promise(() => {});
    });

    const { UNSAFE_getByType } = await renderApp(<PostScreen />);

    expect(await screen.findByText('deserved')).toBeOnTheScreen();
    await waitFor(() => {
      expect(api.fetchComments.mock.calls.length).toBeGreaterThan(1);
    });
    expect(screen.getByText('deserved')).toBeOnTheScreen();
    expect(screen.queryByTestId('comment-thread-skeleton')).toBeNull();
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('spins the refresh control only when they pull', async () => {
    asGuest();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });
    api.fetchComments.mockResolvedValue(commentsPage());

    const { UNSAFE_getByType } = await renderApp(<PostScreen />);
    expect(await screen.findByText('golden hour hits different when you are winning')).toBeOnTheScreen();

    let finishPost!: (value: unknown) => void;
    let finishComments!: (value: unknown) => void;
    api.fetchPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPost = resolve;
        }),
    );
    api.fetchComments.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishComments = resolve;
        }),
    );

    await act(async () => {
      void UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(true);

    await act(async () => {
      finishPost({ ...mockFeed[0]!, status: 'published' });
      finishComments(commentsPage());
    });
    await waitFor(() => {
      expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
    });
  });

  it('opens the post after they sign in — it does not submit a draft', async () => {
    asGuest();
    routerMocks().params = { id: mockFeed[0]!.id };
    api.fetchPost.mockResolvedValue({ ...mockFeed[0]!, status: 'published' });
    const user = userEvent.setup();
    await renderApp(<PostScreen />);
    await screen.findByText('golden hour hits different when you are winning');

    await user.press(screen.getByTestId('comment-submit'));
    expect(await screen.findByText('Sign in to comment')).toBeOnTheScreen();

    await act(async () => {
      asSignedIn();
    });

    await waitFor(() => {
      expect(routerMocks().navigate).toHaveBeenCalledWith(`/post/${mockFeed[0]!.id}`);
    });
    expect(api.createComment).not.toHaveBeenCalled();
  });
});
