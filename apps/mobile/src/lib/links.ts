import type { Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { appEnv } from './env';

/**
 * notifications.data.deep_link → where to go (LLD §12). Orders open in the app;
 * public reports open on the website; staff links are web-only.
 */
export function routeForDeepLink(link: unknown): Href | null {
  if (typeof link !== 'string') return null;
  const order = /^\/orders\/([0-9a-f-]{36})$/.exec(link);
  if (order) return { pathname: '/orders/[id]', params: { id: order[1]! } };
  return null;
}

export async function openDeepLink(link: unknown, navigate: (href: Href) => void): Promise<void> {
  const route = routeForDeepLink(link);
  if (route) return navigate(route);
  if (typeof link === 'string' && link.startsWith('/r/')) {
    await WebBrowser.openBrowserAsync(`${appEnv().EXPO_PUBLIC_API_URL}${link}`);
  }
}
