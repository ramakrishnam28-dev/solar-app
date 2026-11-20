import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

import { pauseLock } from '@/state/lockPause';

import { guessType, type PickedFile } from './files';
export { appendFile, fileProblem, MAX_BYTES, type PickedFile } from './files';
export type Source = 'camera' | 'library' | 'pdf';

/**
 * Opens the camera, the gallery or the file picker. Returns null when the user cancels.
 * Throws an Error with a plain message when permission is refused.
 */
export async function pickFile(source: Source, photosOnly = false): Promise<PickedFile | null> {
  const resume = pauseLock();
  try {
    if (source === 'pdf' && !photosOnly) {
      const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true, multiple: false });
      if (r.canceled || !r.assets?.[0]) return null;
      const a = r.assets[0];
      return { uri: a.uri, name: a.name, type: a.mimeType ?? guessType(a.name, 'application/pdf'), size: a.size };
    }
    if (source === 'camera') {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) throw new Error('Camera permission is off. Turn it on for RCAL Station in your phone settings.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, exif: false, allowsEditing: false };
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0];
    const name = a.fileName ?? `photo_${Date.now()}.jpg`;
    return { uri: a.uri, name, type: a.mimeType ?? guessType(name, 'image/jpeg'), size: a.fileSize };
  } finally {
    resume();
  }
}

/** Current position for site check-in. Throws an Error with a plain message. */
export async function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number | null }> {
  const p = await Location.requestForegroundPermissionsAsync();
  if (!p.granted) throw new Error('Location permission is off. Turn it on for RCAL Station in your phone settings.');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null };
}
