import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { LibraryPermissionError } from './pick-photo';
import { VIDEO_MAX_DURATION_MS } from './video-targets';

/**
 * Library video only. Same iOS rule as photos: do not ask Photos permission
 * (PHPicker). Compatible + H.264 1080p is the native shrink — no JS encode.
 *
 * `videoMaxDuration` is a camera-recording cap on most devices. We still
 * refuse after export in the create screen.
 */
export async function pickVideoFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS === 'android') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new LibraryPermissionError();
    }
  }

  const compatible = ImagePicker.UIImagePickerPreferredAssetRepresentationMode?.Compatible;
  const h264_1080 = ImagePicker.VideoExportPreset?.H264_1920x1080;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    // Recording-only on many devices. Still set so a trim UI, if shown, matches us.
    videoMaxDuration: VIDEO_MAX_DURATION_MS / 1000,
    ...(compatible ? { preferredAssetRepresentationMode: compatible } : {}),
    ...(h264_1080 != null ? { videoExportPreset: h264_1080 } : {}),
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}
