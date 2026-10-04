import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { Platform } from 'react-native';

const KEY = 'prapp_device_id';
let cached: string | null = null;

/** crypto.randomUUID is missing in Hermes; build a v4 UUID from getRandomValues (polyfilled). */
function uuidV4(): string {
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

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
  const fresh = uuidV4();
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, fresh);
    else await SecureStore.setItemAsync(KEY, fresh);
  } catch {
    // not persisted: still usable for this session
  }
  return (cached = fresh);
}
