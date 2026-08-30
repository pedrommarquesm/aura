import { screen, userEvent, waitFor } from '@testing-library/react-native';

import HomeScreen from '@/app/(tabs)/index';

import { api } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asSignedIn } from '../helpers/session';

describe('Signed-in person likes a post', () => {
  beforeEach(() => {
    asSignedIn();
  });

  it('awards Aura and updates the count without asking them to sign in', async () => {
    const user = userEvent.setup();
    await renderApp(<HomeScreen />);
    const like = await screen.findAllByHintText('Like');

    await user.press(like[0]!);

    await waitFor(() => {
      expect(api.likePost).toHaveBeenCalledWith('01j0000000000000000000001');
    });
    expect(screen.getByLabelText(/1,?285 likes/)).toBeTruthy();
    expect(screen.queryByText('Sign in to award Aura')).toBeNull();
  });
});
