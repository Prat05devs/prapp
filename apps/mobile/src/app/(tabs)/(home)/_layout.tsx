import { Stack } from 'expo-router';
import { BRAND_NAME } from '@prapp/shared';
import { LARGE_HEADER, TAB_ROOT } from '@/lib/theme';

export default function HomeLayout() {
  return (
    <Stack screenOptions={LARGE_HEADER}>
      <Stack.Screen name="index" options={{ ...TAB_ROOT, title: BRAND_NAME }} />
    </Stack>
  );
}
