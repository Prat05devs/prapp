import { DefaultTheme, type Theme } from 'expo-router';

// NewsVio palette as plain values (docs/DESIGN.md), for places classes can't reach
// (navigation theme, tab bar, icon tints, ActivityIndicator, RefreshControl).
export const COLORS = {
  canvas: '#fbfaf7',
  paper: '#ffffff',
  subtle: '#f5f3ee',
  elevated: '#ece8df',
  hairline: '#e2ddd2',
  ink: '#17140f',
  body: '#3b3731',
  slate: '#6b655b',
  faint: '#8f8879',
  brand: '#1d3d63',
  verified: '#1e6b45',
  danger: '#b3261e',
  warn: '#8a5300',
} as const;

export const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    background: COLORS.canvas,
    border: COLORS.hairline,
    card: COLORS.canvas,
    notification: COLORS.danger,
    primary: COLORS.brand,
    text: COLORS.ink,
  },
};

/** Native stack header: serif title, no shadow. */
export const STACK_HEADER = {
  headerShadowVisible: false,
  headerTintColor: COLORS.ink,
  headerStyle: { backgroundColor: COLORS.canvas },
  headerTitleStyle: { fontFamily: 'SourceSerif4_600SemiBold', fontSize: 18, color: COLORS.ink },
  headerBackButtonDisplayMode: 'minimal',
} as const;
