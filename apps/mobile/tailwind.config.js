const { hairlineWidth } = require('nativewind/theme');

// Tracking in px: React Native has no em letter-spacing.
const size = (px, lh, trackingEm = 0) => [
  `${px}px`,
  { lineHeight: `${lh}px`, letterSpacing: `${+(px * trackingEm).toFixed(2)}px` },
];

/**
 * NewsVio design system (docs/DESIGN.md) for NativeWind + React Native Reusables. Token names match apps/web/src/app/globals.css so classes read the same
 * on both apps.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // shadcn semantic colours (CSS variables in global.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // NewsVio tokens (docs/DESIGN.md), same names and values as apps/web globals.css
        canvas: '#fbfaf7',
        paper: '#ffffff',
        subtle: '#f5f3ee',
        elevated: '#ece8df',
        hairline: '#e2ddd2',
        // Same colour as hairline, for single-edge borders: `border-hairline` also sets a
        // hairline width on all four sides (borderWidth.hairline below).
        rule: '#e2ddd2',
        divider: '#ebe7de',
        ink: { DEFAULT: '#17140f', soft: '#2a261f' },
        body: '#3b3731',
        slate: '#6b655b',
        faint: '#8f8879',
        brand: { DEFAULT: '#1d3d63', deep: '#132a45', tint: '#e9eef4', soft: '#b9c8da' },
        verified: { DEFAULT: '#1e6b45', deep: '#154d32', tint: '#e5f0e9' },
        danger: { DEFAULT: '#b3261e', tint: '#f7e2df', deep: '#8a1c16' },
        warn: { DEFAULT: '#8a5300', tint: '#f6ead2', deep: '#6b4000' },
      },
      // One family per weight: custom fonts on React Native don't synthesise weights.
      fontFamily: {
        sans: ['PublicSans_400Regular'],
        'sans-medium': ['PublicSans_500Medium'],
        'sans-semibold': ['PublicSans_600SemiBold'],
        display: ['SourceSerif4_600SemiBold'],
        'display-bold': ['SourceSerif4_700Bold'],
        mono: ['IBMPlexMono_500Medium'],
      },
      fontSize: {
        display: size(54, 60, -0.015),
        'display-mobile': size(36, 42, -0.01),
        'headline-lg': size(38, 46, -0.01),
        'headline-lg-mobile': size(28, 34, -0.005),
        'headline-md': size(28, 36, -0.005),
        'headline-sm': size(21, 28),
        'body-lg': size(18, 29),
        'body-md': size(16, 25),
        'body-sm': size(14, 21),
        'label-md': size(15, 21),
        'label-sm': size(13, 18),
        code: size(13, 19),
      },
      // Three steps only (docs/DESIGN.md): 4 small, 6 controls and cards, 10 large panels.
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '6px',
        xl: '10px',
        '2xl': '10px',
        '3xl': '10px',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
