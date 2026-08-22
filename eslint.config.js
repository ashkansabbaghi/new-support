import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '.yarn/**',
      'docs/**',
      'examples/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
      globals: globals.browser,
    },
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['apps/module/src/components/ui/**/*.vue'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
      },
    },
  },
  {
    files: [
      'apps/module/vite.config.ts',
      'eslint.config.js',
      'scripts/**/*.{js,mjs,cjs,ts}',
      'packages/**/scripts/**/*.{js,mjs,cjs,ts}',
      'packages/protocol/**/*.{ts,mjs}',
      'packages/support-sdk/**/*.{ts,mjs}',
      'packages/web-sdk/tests/**/*.ts',
      'packages/web-sdk/vitest.config.ts',
      'apps/module/tests/**/*.ts',
      'apps/module/vitest.config.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      'packages/web-sdk/src/**/*.ts',
      'packages/loader/src/**/*.ts',
      'apps/module/src/**/*.ts',
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
)
