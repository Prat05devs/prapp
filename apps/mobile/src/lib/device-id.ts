import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'prapp_device_id';
let cached: string | null = null;

/** Stable random id sent with fact checks (the API requires one, LLD §11.1). */
export async function deviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    if (existing) return (cached = existing);
  } catch {
    // fall through to a fresh id
  }
  const fresh = globalThis.crypto.randomUUID();
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, fresh);
    else await SecureStore.setItemAsync(KEY, fresh);
  } catch {
    // not persisted: still usable for this session
  }
  return (cached = fresh);
}
