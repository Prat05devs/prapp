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
  brandTint: '#e9eef4',
  verified: '#1e6b45',
  danger: '#b3261e',
  /** verdict panel backgrounds: each status colour's tint (tailwind *.tint) */
  verifiedTint: '#e5f0e9',
  warnTint: '#f6ead2',
  dangerTint: '#f7e2df',
  neutralTint: '#f1eee7',
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

/**
 * A tab's root screen: iOS large title that collapses into the bar on scroll (Android shows the
 * regular bar). The screen's ScrollView needs contentInsetAdjustmentBehavior="automatic".
 */
export const LARGE_HEADER = {
  ...STACK_HEADER,
  headerLargeTitleEnabled: true,
  headerLargeTitleShadowVisible: false,
  headerLargeStyle: { backgroundColor: COLORS.canvas },
  headerLargeTitleStyle: { fontFamily: 'SourceSerif4_700Bold', fontSize: 32, color: COLORS.ink },
} as const;

/**
 * A tab's root screen: no native bar. The screen draws its own compact header inside the scroll
 * (ScrollScreen's `header`), so content starts right under the status bar (docs/MOBILE-UX.md).
 */
export const TAB_ROOT = { headerShown: false } as const;
