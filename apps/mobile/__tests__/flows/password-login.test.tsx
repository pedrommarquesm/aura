import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { GuardedCreateTab } from '@/components/navigation/create-tab-button';

import { api } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest } from '../helpers/session';

describe('Password sign-in', () => {
  beforeEach(() => {
    asGuest();
  });

  it('signs in with email or username and does not start compose first', async () => {
    const user = userEvent.setup();
    await renderApp(<GuardedCreateTab />);
    await user.press(await screen.findByLabelText('Create a post'));

    expect(await screen.findByText('Sign in to post')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email or username')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Email or username'), 'e2e@auraclimb.test');
    await user.type(screen.getByLabelText('Password'), 'long-enough');
    await user.press(screen.getByLabelText('Sign in with email'));

    await waitFor(() => {
      expect(api.signInWithPassword).toHaveBeenCalledWith(
        'e2e@auraclimb.test',
        'long-enough',
      );
    });
    await waitFor(() => {
      expect(screen.queryByText('Sign in to post')).toBeNull();
    });
  });

  it('creates an account from the same sheet', async () => {
    const user = userEvent.setup();
    await renderApp(<GuardedCreateTab />);
    await user.press(await screen.findByLabelText('Create a post'));
    await screen.findByText('Sign in to post');

    await user.press(screen.getByLabelText('Create an account'));
    await user.type(screen.getByLabelText('username'), 'e2e');
    await user.type(screen.getByLabelText('Email'), 'e2e@auraclimb.test');
    await user.type(screen.getByLabelText('Password'), 'long-enough');
    await user.press(screen.getByLabelText('Create account'));

    await waitFor(() => {
      expect(api.registerWithPassword).toHaveBeenCalledWith({
        email: 'e2e@auraclimb.test',
        username: 'e2e',
        password: 'long-enough',
      });
    });
  });
});
