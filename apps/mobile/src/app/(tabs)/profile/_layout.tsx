import { Stack } from 'expo-router';
import { LARGE_HEADER, TAB_ROOT } from '@/lib/theme';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={LARGE_HEADER}>
      <Stack.Screen name="index" options={{ ...TAB_ROOT, title: 'Profile' }} />
    </Stack>
  );
}
