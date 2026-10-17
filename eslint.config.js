const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  {
    ignores: [
      'dist/**',
      'coverage/**',
      '.expo/**',
      'src/infrastructure/supabase/database.types.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/infrastructure/*'],
              message:
                'Compose adapters in src/bootstrap; consume application/domain contracts.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-native',
                'expo*',
                '@supabase/*',
                '@tanstack/*',
                'zustand',
                '@/infrastructure/*',
                '@/shared/ui/*',
                '../presentation/*',
                '../infrastructure/*',
              ],
              message: 'Domain must remain independent of UI and persistence.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/bootstrap/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
