import type * as HapticsModule from 'expo-haptics';

// Touch feedback (docs/DESIGN.md, Motion). expo-haptics is a native module: on a development
// build made before it was added, importing it throws, so feedback is skipped instead of
// crashing. Rebuild the app (npx expo run:ios|android, or EAS) to feel it.
let Haptics: typeof HapticsModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
  Haptics = require('expo-haptics') as typeof HapticsModule;
} catch {
  Haptics = null;
}

function run(effect: (h: typeof HapticsModule) => Promise<void>) {
  if (Haptics) void effect(Haptics).catch(() => {});
}

export const haptics = {
  /** a primary action: buttons, cards that navigate */
  tap: () => run((h) => h.impactAsync(h.ImpactFeedbackStyle.Light)),
  /** a selection changed: tabs, segments, switches, radio cards */
  select: () => run((h) => h.selectionAsync()),
  success: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Success)),
  warning: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Warning)),
  error: () => run((h) => h.notificationAsync(h.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics;
