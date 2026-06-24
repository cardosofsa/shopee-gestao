import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // ── Checklist IA (blocking) ──────────────────────────────────────────────
      // sem console.log
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // sem TODO/FIXME/HACK
      'no-warning-comments': [
        'error',
        { terms: ['todo', 'fixme', 'hack', 'xxx'], location: 'start' },
      ],
      // imports organizados
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      // sem eval
      'no-eval': 'error',

      // ── Rebaixados para warn (tech debt pré-existente) ───────────────────────
      // any explícito — 71 ocorrências no código atual; resolver incrementalmente
      '@typescript-eslint/no-explicit-any': 'warn',
      // Regras novas do react-hooks v7 — requerem refatoração adicional
      'react-hooks/static-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/incompatible-library': 'warn',
      // Fast Refresh: alguns arquivos exportam helpers + componentes juntos
      'react-refresh/only-export-components': 'warn',
      // Expressões não utilizadas — inclui casos válidos de JSX condicional
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
]);
