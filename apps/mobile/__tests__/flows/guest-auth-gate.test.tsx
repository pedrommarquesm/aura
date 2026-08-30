import { screen, userEvent } from '@testing-library/react-native';

import ProfileScreen from '@/app/(tabs)/profile';
import { GuardedCreateTab } from '@/components/navigation/create-tab-button';

import { api } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest } from '../helpers/session';

describe('Guest hits a signed-in-only action', () => {
  beforeEach(() => {
    asGuest();
  });

  it('asks them to sign in when they tap Create — compose never starts', async () => {
    const user = userEvent.setup();
    renderApp(<GuardedCreateTab />);

    await user.press(await screen.findByLabelText('Create a post'));

    expect(await screen.findByText('Sign in to post')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Choose photo')).toBeNull();
    expect(api.createUpload).not.toHaveBeenCalled();
  });

  it('shows Sign in on Profile instead of their Aura', async () => {
    renderApp(<ProfileScreen />);

    expect(await screen.findByText('Start farming Aura')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sign in')).toBeOnTheScreen();
    expect(screen.queryByText('@tester')).toBeNull();
  });

  it('lets them dismiss the auth sheet', async () => {
    const user = userEvent.setup();
    renderApp(<GuardedCreateTab />);
    await user.press(await screen.findByLabelText('Create a post'));
    await screen.findByText('Sign in to post');

    await user.press(screen.getAllByLabelText('Not now')[0]!);

    expect(screen.queryByText('Sign in to post')).toBeNull();
  });
});
