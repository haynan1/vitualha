import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

/**
 * Regras que existem para impedir defeito, nao para impor estilo — estilo é
 * responsabilidade do Prettier. O foco é o que quebra em producao: promessa
 * sem await, tipo `any` silencioso, import morto, condicao impossivel.
 */
export default defineConfig([
  globalIgnores([
    'dist/**',
    '.astro/**',
    'node_modules/**',
    'design/**',
    'public/admin/sveltia-cms.js',
    'public/pagefind/**',
  ]),

  js.configs.recommended,
  ts.configs.strictTypeChecked,
  /**
   * Acessibilidade fica a cargo do `astro check`, que traz as diagnosticas
   * nativas do compilador. O eslint-plugin-jsx-a11y ainda declara peer
   * `eslint@^9`, e forcar a instalacao quebraria `npm ci` no CI.
   */
  astro.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Numero interpolado em template literal é seguro e comum aqui
      // (`--hue: ${categoria.hue}`); o resto continua barrado.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Analise com tipos apenas onde ela é confiavel.
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  /**
   * Componentes .astro ficam fora das regras que dependem de tipo: o
   * astro-eslint-parser nao entrega informacao de tipo do template, e o
   * resultado seria uma enxurrada de "unsafe return" falso em cada `.map()`
   * de JSX. A verificacao de tipo desses arquivos é feita por `astro check`,
   * que usa o language server do proprio Astro.
   */
  {
    files: ['**/*.astro'],
    extends: [ts.configs.disableTypeChecked],
  },

  // Scripts de build rodam em Node puro.
  {
    files: ['scripts/**/*.mjs', 'public/*.js'],
    extends: [ts.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },
]);
