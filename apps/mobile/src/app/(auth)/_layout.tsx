import { Stack } from 'expo-router';

// Sign-in is the group's entry point.
export const unstable_settings = {
  anchor: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack initialRouteName="sign-in" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
