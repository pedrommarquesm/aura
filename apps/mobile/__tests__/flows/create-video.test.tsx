import { screen, userEvent, waitFor } from '@testing-library/react-native';

import CreateScreen from '@/app/(tabs)/create';
import type { OptimizedVideo } from '@/lib/media/optimize-video';

import { api, sampleVideoAsset } from '../helpers/api';
import { renderApp } from '../helpers/render';
import { asSignedIn } from '../helpers/session';

const readyVideo: OptimizedVideo = {
  uri: 'file:///ready.mp4',
  mimeType: 'video/mp4',
  byteSize: 8_000_000,
  width: 1080,
  height: 1920,
  durationMs: 12_000,
};

describe('Signed-in person posts a video', () => {
  beforeEach(() => {
    asSignedIn();
  });

  it('shows the clip right away, prepares it, then lets them Post', async () => {
    let finishShrink: (video: OptimizedVideo) => void = () => undefined;
    api.optimizePickedVideo.mockImplementation(
      () =>
        new Promise<OptimizedVideo>((resolve) => {
          finishShrink = resolve;
        }),
    );

    const user = userEvent.setup();
    await renderApp(<CreateScreen />);
    await user.press(await screen.findByLabelText('Choose video'));

    expect(await screen.findByLabelText('Caption')).toBeOnTheScreen();
    expect(await screen.findByText('Preparing…')).toBeOnTheScreen();

    finishShrink(readyVideo);

    await waitFor(() => {
      expect(screen.queryByText('Preparing…')).toBeNull();
    });

    await user.press(screen.getByLabelText('Post'));

    await waitFor(() => {
      expect(api.createUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'video/mp4',
          durationMs: 12_000,
        }),
      );
      expect(api.completeUpload).toHaveBeenCalled();
    });
  });

  it('refuses a clip over a minute and never starts an upload', async () => {
    api.pickVideoFromLibrary.mockResolvedValue({
      ...sampleVideoAsset,
      uri: 'file:///long.mp4',
      fileName: 'long.mp4',
      duration: 90,
    });

    const user = userEvent.setup();
    await renderApp(<CreateScreen />);
    await user.press(await screen.findByLabelText('Choose video'));

    expect(
      await screen.findByText('Videos can be 60 seconds at most. Try another.'),
    ).toBeOnTheScreen();
    expect(api.createUpload).not.toHaveBeenCalled();
    expect(api.optimizePickedVideo).not.toHaveBeenCalled();
  });

  it('refuses a clip that is still too big after shrink', async () => {
    api.pickVideoFromLibrary.mockResolvedValue({
      ...sampleVideoAsset,
      uri: 'file:///huge.mp4',
      fileName: 'huge.mp4',
      fileSize: 180_000_000,
      width: 2160,
      height: 3840,
      duration: 20,
    });
    api.optimizePickedVideo.mockRejectedValue(new Error('too_large'));

    const user = userEvent.setup();
    await renderApp(<CreateScreen />);
    await user.press(await screen.findByLabelText('Choose video'));

    expect(await screen.findByText('That file is too large. Try another.')).toBeOnTheScreen();
    expect(api.createUpload).not.toHaveBeenCalled();
  });
});
