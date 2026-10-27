import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { FC_AI_CONSENT } from '@prapp/shared';

// Permission to send fact-check input to third-party AI (App Store guideline 5.1.2(i)). Stored on
// the device, so it covers guests too; one copy shared by every screen that reads it.
const KEY = 'newsvio_ai_consent_v1';
let granted: boolean | null = null;
const listeners = new Set<(value: boolean) => void>();

async function load(): Promise<boolean> {
  if (granted === null) granted = (await AsyncStorage.getItem(KEY).catch(() => null)) === 'yes';
  return granted;
}

async function save(value: boolean) {
  granted = value;
  listeners.forEach((l) => l(value));
  await AsyncStorage.setItem(KEY, value ? 'yes' : 'no').catch(() => {});
}

/** Whether the user allowed AI processing, with ways to ask, grant and revoke. */
export function useAiConsent() {
  const [value, setValue] = useState(granted ?? false);
  useEffect(() => {
    listeners.add(setValue);
    void load().then(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);

  /** Resolves true once allowed: at once if already granted, otherwise after asking. */
  async function ensure(): Promise<boolean> {
    if (await load()) return true;
    return new Promise((resolve) =>
      Alert.alert(FC_AI_CONSENT.title, FC_AI_CONSENT.body, [
        { text: FC_AI_CONSENT.decline, style: 'cancel', onPress: () => resolve(false) },
        {
          text: FC_AI_CONSENT.allow,
          onPress: () => void save(true).then(() => resolve(true)),
        },
      ]),
    );
  }

  return { granted: value, ensure, set: save };
}
