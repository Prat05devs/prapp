import { DefaultTheme, type Theme } from 'expo-router';

// Stitch palette as plain values, for places classes can't reach
// (navigation theme, tab bar, icon tints, ActivityIndicator, RefreshControl).
export const COLORS = {
  canvas: '#ffffff',
  subtle: '#f8f9fa',
  elevated: '#f4f5f6',
  hairline: '#e5e7eb',
  ink: '#111111',
  body: '#444748',
  slate: '#71717a',
  faint: '#a1a1aa',
  emerald: '#10b981',
  emeraldStrong: '#006c49',
  danger: '#ba1a1a',
  warn: '#b45309',
} as const;

export const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    background: COLORS.canvas,
    border: COLORS.hairline,
    card: COLORS.canvas,
    notification: COLORS.danger,
    primary: COLORS.emeraldStrong,
    text: COLORS.ink,
  },
};

/** Native stack header in the Stitch type: Manrope title, no shadow, hairline-free. */
export const STACK_HEADER = {
  headerShadowVisible: false,
  headerTintColor: COLORS.ink,
  headerStyle: { backgroundColor: COLORS.canvas },
  headerTitleStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 17, color: COLORS.ink },
  headerBackButtonDisplayMode: 'minimal',
} as const;
