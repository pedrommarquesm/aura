import { screen, userEvent, waitFor } from '@testing-library/react-native';

import AvatarEditScreen from '@/app/avatar-edit';
import ProfileScreen from '@/app/(tabs)/profile';
import UserProfileScreen from '@/app/user/[username]';
import { setPendingAvatarSource } from '@/lib/media/pending-avatar';
import { useSessionStore } from '@/store/session';

import {
  api,
  avatarCompleteResponse,
  avatarUploadResponse,
  profileFor,
  samplePhotoAsset,
  testUser,
} from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asGuest, asSignedIn, routerMocks } from '../helpers/session';

describe('Profile photo', () => {
  it('opens the library picker from the pencil on your own profile', async () => {
    asSignedIn();
    const user = userEvent.setup();
    await renderApp(<ProfileScreen />);

    await user.press(await screen.findByLabelText('Edit photo'));

    expect(api.pickPhotoFromLibrary).toHaveBeenCalled();
    expect(routerMocks().push).toHaveBeenCalledWith('/avatar-edit');
  });

  it('does not show the pencil on someone else\'s profile', async () => {
    asGuest();
    routerMocks().params = { username: 'alice' };
    api.fetchPublicProfile.mockResolvedValue(
      profileFor({ ...testUser, id: 'u-alice', username: 'alice', displayName: null }),
    );
    await renderApp(<UserProfileScreen />);

    expect((await screen.findAllByText('@alice')).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Edit photo')).toBeNull();
  });

  it('uploads the square crop and updates the avatar', async () => {
    asSignedIn();
    const nextUrl = 'https://cdn.auraclimb.com/avatars/u-tester/new.jpg';
    api.completeAvatarUpload.mockResolvedValue(avatarCompleteResponse(nextUrl));
    setPendingAvatarSource({
      uri: samplePhotoAsset.uri,
      width: samplePhotoAsset.width,
      height: samplePhotoAsset.height,
    });

    const user = userEvent.setup();
    await renderApp(<AvatarEditScreen />);

    await user.press(await screen.findByLabelText('Use photo'));

    await waitFor(() => {
      expect(api.cropAvatarPhoto).toHaveBeenCalled();
      expect(api.createAvatarUpload).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/jpeg' }),
      );
      expect(api.putPresignedObject).toHaveBeenCalled();
      expect(api.completeAvatarUpload).toHaveBeenCalledWith(avatarUploadResponse.uploadId);
    });
    await waitFor(() => {
      expect(useSessionStore.getState().user?.avatarUrl).toBe(nextUrl);
      expect(routerMocks().back).toHaveBeenCalled();
    });
  });
});
