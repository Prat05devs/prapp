import { Stack } from 'expo-router';

// Without an index route the group would open its first file alphabetically (otp), so
// signed-out users landed on an empty code screen. Sign-in is the entry point.
export const unstable_settings = {
  anchor: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack initialRouteName="sign-in" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="otp" />
    </Stack>
  );
}
