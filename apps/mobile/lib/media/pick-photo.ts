import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * PHPicker (iOS 14+) is out-of-process and does not need photo-library
 * permission. Asking for it is what kills the app when Info.plist is missing
 * `NSPhotoLibraryUsageDescription` — iOS terminates instead of showing a
 * dialog. Official Expo docs: do not request library permission to open the
 * picker.
 *
 * `Current` + `quality: 1` takes the HEIC fast path, which *does* read
 * PHAsset and will also terminate a build without that plist key (and can
 * jetsam on a 48MP original). Compatible JPEG is enough for the 2160 upload
 * target.
 */
export class LibraryPermissionError extends Error {
  constructor() {
    super('library_permission');
    this.name = 'LibraryPermissionError';
  }
}

export async function pickPhotoFromLibrary(): Promise<ImagePicker.ImagePickerAsset | null> {
  if (Platform.OS === 'android') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new LibraryPermissionError();
    }
  }

  const compatible = ImagePicker.UIImagePickerPreferredAssetRepresentationMode?.Compatible;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
    exif: false,
    ...(compatible ? { preferredAssetRepresentationMode: compatible } : {}),
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}
