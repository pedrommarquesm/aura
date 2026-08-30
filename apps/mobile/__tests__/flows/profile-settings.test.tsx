import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { RefreshControl } from 'react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import SettingsScreen from '@/app/settings';
import { queryKeys } from '@/lib/query/keys';

import { api, testUser } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asSignedIn } from '../helpers/session';

describe('Signed-in profile and settings', () => {
  beforeEach(() => {
    asSignedIn();
  });

  it('shows their Aura, posts, and lets them sign out', async () => {
    const user = userEvent.setup();
    await renderApp(<ProfileScreen />);

    expect(await screen.findByText('@tester')).toBeOnTheScreen();
    expect(screen.getByText('Aura Farmer')).toBeOnTheScreen();
    expect(
      await screen.findByLabelText('golden hour hits different when you are winning'),
    ).toBeOnTheScreen();

    await user.press(screen.getByLabelText('Sign out'));

    expect(await screen.findByText('Start farming Aura')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();
    expect(screen.queryByText('@tester')).toBeNull();
  });

  it('does not spin the refresh control when the profile refetches in the background', async () => {
    const { queryClient, UNSAFE_getByType } = await renderApp(<ProfileScreen />);
    expect(await screen.findByText('@tester')).toBeOnTheScreen();

    api.fetchPublicProfile.mockImplementation(() => new Promise(() => {}));
    api.fetchUserPosts.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(testUser.username) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(testUser.id) });
    });

    expect(screen.getByText('@tester')).toBeOnTheScreen();
    expect(UNSAFE_getByType(RefreshControl).props.refreshing).toBe(false);
  });

  it('switches the app to Portuguese from Settings', async () => {
    const user = userEvent.setup();
    await renderApp(<SettingsScreen />);

    expect(await screen.findByText('Language')).toBeOnTheScreen();
    await user.press(screen.getByText('Português'));

    await waitFor(() => {
      expect(screen.getByText('Idioma')).toBeOnTheScreen();
    });
  });
});
