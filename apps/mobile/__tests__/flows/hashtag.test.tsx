import { screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';
import CreateScreen from '@/app/(tabs)/create';
import HashtagScreen from '@/app/hashtag/[tag]';
import { mockFeed } from '@/mocks/feed';

import { api, feedPage } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asSignedIn, routerMocks } from '../helpers/session';

const tagged = {
  ...mockFeed[0]!,
  caption: 'gold hour #sunset',
};

describe('Hashtags', () => {
  it('colours a hashtag while composing and does not navigate', async () => {
    asSignedIn();
    const user = userEvent.setup();
    await renderApp(<CreateScreen />);

    await user.press(await screen.findByLabelText('Choose photo'));
    await user.type(await screen.findByLabelText('Caption'), 'hi #aura');

    expect(await screen.findByText('#aura')).toBeOnTheScreen();
    expect(routerMocks().push).not.toHaveBeenCalled();
    expect(routerMocks().navigate).not.toHaveBeenCalledWith(expect.stringContaining('/hashtag/'));
  });

  it('opens the hashtag page from a post caption', async () => {
    asGuest();
    api.fetchFeedPage.mockResolvedValue(feedPage([tagged]));
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);

    await user.press(await screen.findByLabelText('Open #sunset'));

    expect(routerMocks().push).toHaveBeenCalledWith('/hashtag/sunset');
  });

  it('shows a back control and a search field pre-filled with the tag', async () => {
    asGuest();
    routerMocks().params = { tag: 'sunset' };
    api.fetchHashtagPage.mockResolvedValue(feedPage([tagged]));

    await renderApp(<HashtagScreen />);

    expect(await screen.findByLabelText('Back')).toBeOnTheScreen();
    expect(screen.getByLabelText('Search hashtag')).toHaveDisplayValue('#sunset');
    expect(await screen.findByLabelText('gold hour #sunset')).toBeOnTheScreen();

    await waitFor(() => {
      expect(api.fetchHashtagPage).toHaveBeenCalledWith('sunset', null, expect.anything());
    });
  });
});
