// @ts-check

import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import vitest from '@vitest/eslint-plugin';
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: ['lib/', 'database/'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.[jt]s'],
    languageOptions: {ecmaVersion: 2022},
    rules: {
      'no-undef': 'error',
      'no-var': 'error',
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['eslint.config.js', 'tsup.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    ...jsdoc.configs['flat/recommended-typescript'],
  },
  {
    files: ['**/*.ts'],
    plugins: {jsdoc},
    settings: {
      jsdoc: {mode: 'typescript'},
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          checkConstructors: false,
          contexts: ['MethodDefinition', 'FunctionDeclaration'],
        },
      ],
      'jsdoc/check-syntax': 'error',
      'jsdoc/newline-after-description': 'off',
      'jsdoc/check-types': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-param-type': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {...globals.node},
    },
  },
  {
    files: ['tests/**/*.ts'],
    ...vitest.configs.recommended,
  },
  prettierConfigRecommended
);
