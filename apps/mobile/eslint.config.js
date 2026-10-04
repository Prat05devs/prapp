// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // Backend-only data access: the app reaches the database through the API only. The Supabase
  // client is for Supabase Auth (session, sign-in/out) in these files and nowhere else.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/supabase.ts',
      'src/lib/auth-link.ts',
      'src/lib/api.ts',
      'src/providers/auth-provider.tsx',
      'src/hooks/use-password-auth.ts',
      'src/app/reset-password.tsx',
      'src/hooks/use-google-sign-in.ts',
      'src/hooks/use-sign-out.ts',
      'src/app/(tabs)/profile.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase',
              message: 'App code must call the API (src/lib/api.ts), not the database.',
            },
          ],
          patterns: [
            {
              group: ['./supabase'],
              message: 'App code must call the API (src/lib/api.ts), not the database.',
            },
          ],
        },
      ],
    },
  },
  { ignores: ['dist/*', '.expo/*', 'expo-env.d.ts'] },
]);
