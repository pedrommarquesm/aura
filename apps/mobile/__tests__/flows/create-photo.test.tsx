import { screen, userEvent, waitFor } from '@testing-library/react-native';

import CreateScreen from '@/app/(tabs)/create';

import { api, uploadResponse } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asSignedIn, routerMocks } from '../helpers/session';

describe('Signed-in person posts a photo', () => {
  beforeEach(() => {
    asSignedIn();
  });

  it('lets them pick, caption, and Post — then waits until the post is live', async () => {
    const user = userEvent.setup();
    await renderApp(<CreateScreen />);

    await user.press(await screen.findByLabelText('Choose photo'));

    expect(await screen.findByLabelText('Caption')).toBeOnTheScreen();
    expect(screen.getByLabelText('Post')).toBeOnTheScreen();
    expect(screen.getByLabelText('Cancel')).toBeOnTheScreen();

    await user.type(screen.getByLabelText('Caption'), 'sunset walk');
    await user.press(screen.getByLabelText('Post'));

    await waitFor(() => {
      expect(api.createUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/jpeg',
        }),
      );
    });
    await waitFor(() => {
      expect(api.putPresignedObject).toHaveBeenCalled();
      expect(api.completeUpload).toHaveBeenCalledWith(uploadResponse.postId, 'sunset walk');
    });
    await waitFor(() => {
      expect(routerMocks().navigate).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
