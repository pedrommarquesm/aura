import { View } from 'react-native';
import { screen, userEvent, waitFor } from '@testing-library/react-native';

import { api } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asNeedsUsername } from '../helpers/session';

describe('New account claims a username', () => {
  beforeEach(() => {
    asNeedsUsername();
  });

  it('lets them pick a name and continue into the app', async () => {
    const user = userEvent.setup();
    renderApp(<View />);

    expect(await screen.findByText('Pick your username')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('username'), 'nova');
    await user.press(screen.getByLabelText('Claim username'));

    await waitFor(() => {
      expect(api.claimUsername).toHaveBeenCalledWith('nova');
    });
  });
});
