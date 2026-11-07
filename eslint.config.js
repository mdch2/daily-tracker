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
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/\\S/]',
          message: 'Visible text belongs in the en/es translation catalogs.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(title|label|placeholder|accessibilityLabel|message)$/] > Literal',
          message: 'Translate visible and accessible labels with i18next.',
        },
        {
          selector: 'Literal[value=/^(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()/]',
          message:
            'Use semantic theme tokens instead of component color literals.',
        },
      ],
    },
  },
  {
    files: ['src/bootstrap/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
