import { Stack } from 'expo-router';
import { TAB_ROOT, STACK_HEADER } from '@/lib/theme';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={STACK_HEADER}>
      <Stack.Screen name="index" options={{ ...TAB_ROOT, title: 'Orders' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Order' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Review and pay' }} />
    </Stack>
  );
}
