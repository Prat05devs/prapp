import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  // Backend-only data access: browser code reaches the database through /api/* only. The
  // browser Supabase client is for Supabase Auth (sign-in/out) in these files and nowhere else.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/supabase/**',
      'src/app/team-login/team-login-form.tsx',
      'src/hooks/use-delete-account.ts',
      'src/hooks/use-email-otp.ts',
      'src/hooks/use-google-sign-in.ts',
      'src/hooks/use-sign-out.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase/browser',
              message: 'Browser code must call the backend (/api/*), not the database.',
            },
          ],
        },
      ],
    },
  },
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
