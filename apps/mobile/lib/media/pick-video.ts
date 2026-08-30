import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { LibraryPermissionError } from './pick-photo';
import { VIDEO_MAX_DURATION_MS } from './video-targets';

/**
 * Library video only. Same iOS rule as photos: do not ask Photos permission
 * (PHPicker).
 *
 * Do not set `videoExportPreset` (H.264 1080p) or Compatible representation.
 * Both transcode before the picker promise resolves, so the create screen
 * cannot appear until iOS finishes. Passthrough + Current returns the
 * existing file; Mux transcodes the master after upload.
 *
 * `videoMaxDuration` is a camera-recording cap on most devices. We still
 * refuse after pick on the create screen.
 */
export async function pickVideoFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS === 'android') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new LibraryPermissionError();
    }
  }

  const current = ImagePicker.UIImagePickerPreferredAssetRepresentationMode?.Current;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    // Recording-only on many devices. Still set so a trim UI, if shown, matches us.
    videoMaxDuration: VIDEO_MAX_DURATION_MS / 1000,
    ...(current ? { preferredAssetRepresentationMode: current } : {}),
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}
