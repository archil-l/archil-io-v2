import js from '@eslint/js';
import globals from 'globals';
import typescriptParser from '@typescript-eslint/parser';
import typescript from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es6,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      'no-undef': 'off', // TypeScript handles this
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['.eslintrc.cjs', 'server.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    ignores: ['!**/.server', '!**/.client', 'node_modules/', 'build/', 'dist/'],
  },
];