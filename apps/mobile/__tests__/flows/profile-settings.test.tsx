import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import SettingsScreen from '@/app/settings';
import { queryKeys } from '@/lib/query/keys';

import { testUser } from '../helpers/api';
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

  it('keeps the profile on screen while it refetches', async () => {
    const { queryClient } = await renderApp(<ProfileScreen />);
    expect(await screen.findByText('@tester')).toBeOnTheScreen();

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.user(testUser.username) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(testUser.id) });
    });

    expect(screen.getByText('@tester')).toBeOnTheScreen();
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
