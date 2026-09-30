const { hairlineWidth } = require('nativewind/theme');

// Tracking in px: React Native has no em letter-spacing.
const size = (px, lh, trackingEm = 0) => [
  `${px}px`,
  { lineHeight: `${lh}px`, letterSpacing: `${+(px * trackingEm).toFixed(2)}px` },
];

/**
 * Stitch design system ("Obsidian & Emerald Minimalist") for NativeWind + React Native
 * Reusables. Token names match apps/web/src/app/globals.css so classes read the same
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
        // Stitch tokens
        canvas: '#ffffff',
        subtle: '#f8f9fa',
        elevated: '#f4f5f6',
        hairline: '#e5e7eb',
        divider: '#eeeeee',
        ink: { DEFAULT: '#111111', soft: '#18181b' },
        body: '#444748',
        slate: '#71717a',
        faint: '#a1a1aa',
        emerald: {
          DEFAULT: '#10b981',
          strong: '#006c49',
          deep: '#065f46',
          tint: '#ecfdf5',
          soft: '#6cf8bb',
        },
        danger: { DEFAULT: '#ba1a1a', tint: '#ffdad6', deep: '#93000a' },
        warn: { DEFAULT: '#b45309', tint: '#fef3c7', deep: '#92400e' },
      },
      // One family per weight: custom fonts on React Native don't synthesise weights.
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        display: ['Manrope_600SemiBold'],
        'display-bold': ['Manrope_700Bold'],
        mono: ['JetBrainsMono_500Medium'],
      },
      fontSize: {
        display: size(56, 64, -0.03),
        'display-mobile': size(36, 42, -0.025),
        'headline-lg': size(40, 48, -0.025),
        'headline-lg-mobile': size(28, 34, -0.02),
        'headline-md': size(28, 36, -0.02),
        'headline-sm': size(20, 28, -0.015),
        'body-lg': size(18, 28, -0.01),
        'body-md': size(15, 24, -0.005),
        'body-sm': size(13, 20),
        'label-md': size(14, 20),
        'label-sm': size(12, 16, 0.01),
        code: size(12, 18, -0.01),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
