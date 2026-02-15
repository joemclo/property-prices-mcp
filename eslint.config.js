import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.git/**',
      'src/types/rdf/**/*.generated.ts',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.d.ts', 'src/types/rdf/**/*.generated.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        fetch: true,
        Headers: true,
        Request: true,
        Response: true,
        URL: true,
        URLSearchParams: true,
      },
    },
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: true,
    },
    settings: {
      node: {
        tryExtensions: ['.ts', '.js', '.json', '.node'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'prettier': prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettier.configs.recommended.rules,
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
    },
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]; 
