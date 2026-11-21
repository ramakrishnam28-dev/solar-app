import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { KeyValueStore } from './kv';

/** Tokens live in the phone's secure keystore (Android Keystore / iOS Keychain). */
export const secureStore: KeyValueStore = {
  async get(key) {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (Platform.OS === 'web') { globalThis.localStorage?.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (Platform.OS === 'web') { globalThis.localStorage?.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};
