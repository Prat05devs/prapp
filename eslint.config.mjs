// Shared ESLint config for packages/*. apps/web and apps/mobile have their own
// configs (Next.js and Expo presets) that extend the same strict TS rules.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export const strictTsRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/consistent-type-imports': 'error',
};

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', 'apps/**', 'packages/db-types/src/database.ts'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  { rules: strictTsRules },
  prettier,
);
