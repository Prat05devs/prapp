import type { ConfigContext, ExpoConfig } from 'expo/config';

// Static config lives in app.json; this adds what depends on env vars.
// App name NewsVio, bundle id com.newsvio.app (final, 2026-10-01).
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  // Native Google sign-in needs the reversed iOS client ID as a URL scheme.
  // Without it the plugin is left out so prebuild still works (email OTP only).
  const googlePlugin: [string, { iosUrlScheme: string }][] = iosClientId
    ? [
        [
          '@react-native-google-signin/google-signin',
          { iosUrlScheme: iosClientId.split('.').reverse().join('.') },
        ],
      ]
    : [];

  return {
    ...config,
    name: config.name ?? 'NewsVio',
    slug: config.slug ?? 'newsvio',
    plugins: [...(config.plugins ?? []), ...googlePlugin],
  };
};
