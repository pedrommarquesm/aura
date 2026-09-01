/**
 * Byte length of a local picker URI.
 *
 * Do not use `expo-file-system`'s `File` constructor here. Picker URIs on iOS
 * are often `ph://` / `assets-library://`; constructing a File for those can
 * abort the process (try/catch does not catch that).
 *
 * `asset.fileSize` is still often 0. `fetch` + `arrayBuffer().byteLength` is
 * enough for a JPEG the picker already copied into the app container.
 */
export async function measureFileBytes(uri: string, reported?: number | null): Promise<number> {
  if (reported && reported > 0) return reported;

  const response = await fetch(uri);
  const bytes = (await response.arrayBuffer()).byteLength;
  if (bytes > 0) return bytes;

  throw new Error('unreadable');
}
