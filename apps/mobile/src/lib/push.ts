import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

let registeredToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Asked after the first successful action, not on launch (LLD §12). Registers the Expo
 * push token for the signed-in user via register_device_token (moves between accounts).
 */
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice || Platform.OS === 'web') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Order and fact-check updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return; // needs an EAS project (eas init) for push tokens
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  // POST /api/devices runs register_device_token as the user (moves the token between accounts).
  await api.devices.register(token, Platform.OS === 'ios' ? 'ios' : 'android');
  registeredToken = token;
}

/** On sign-out: stop pushes to this device for the old account (LLD §6.3). */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  await api.devices.unregister(registeredToken).catch(() => {});
  registeredToken = null;
}
