/**
 * Frontend ESLint config.
 *
 * Organized in the same order developers read the codebase: base syntax,
 * TypeScript readability, React hook safety, then folder-boundary rules.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const SOURCE_FILES = ['**/*.{ts,tsx}'];
const PUBLIC_ENTRYPOINT_CONSUMERS = [
  'app/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'pages/**/*.{ts,tsx}',
  'tests/**/*.{ts,tsx}',
  'index.tsx',
];
const FRONTEND_GLOBALS = {
  ...globals.browser,
  ...globals.node,
};

function restrictImports(options) {
  return {
    'no-restricted-imports': ['error', options],
  };
}

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'node_modules/**']),
  {
    name: 'project/linter-options',
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: 'project/source-files',
    files: SOURCE_FILES,
    languageOptions: {
      globals: FRONTEND_GLOBALS,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // Readability first: make type-only dependencies explicit and keep
      // intentionally ignored variables visually obvious.
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // We avoid effect-heavy orchestration in this codebase, so state writes in
      // effects deserve extra attention.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    name: 'architecture/public-entrypoints',
    files: PUBLIC_ENTRYPOINT_CONSUMERS,
    rules: restrictImports({
      patterns: [
        {
          group: ['@/client-api/*'],
          message: 'Import backend communication through "@client-api" so the public boundary stays obvious and avoids the nginx /api proxy path.',
        },
        {
          group: ['@/utils/*'],
          message: 'Import shared helpers through "@/utils" so folder-private helpers can stay private.',
        },
      ],
    }),
  },
  {
    name: 'architecture/components-are-ui-only',
    files: ['components/**/*.{ts,tsx}'],
    rules: restrictImports({
      paths: [
        {
          name: 'react-router-dom',
          importNames: [
            'useActionData',
            'useLoaderData',
            'useLocation',
            'useNavigate',
            'useNavigation',
            'useParams',
            'useRouteError',
            'useSearchParams',
          ],
          message: 'Components may render router primitives like Link, but route hooks belong in pages.',
        },
        {
          name: 'sonner',
          message: 'Toast side effects belong in pages, not presentational components.',
        },
      ],
      patterns: [
        {
          group: ['@client-api', '@/client-api', '@/client-api/*'],
          message: 'Components should receive data via props instead of calling the backend directly.',
        },
        {
          group: ['@/pages', '@/pages/*'],
          message: 'Components should not depend on page orchestration.',
        },
      ],
    }),
  },
  {
    name: 'architecture/utils-stay-framework-agnostic',
    files: ['utils/**/*.{ts,tsx}'],
    rules: restrictImports({
      paths: [
        {
          name: '@client-api',
          allowTypeImports: true,
          message: 'Utilities may depend on client API types, but runtime backend calls stay in client-api/.',
        },
        {
          name: 'react',
          message: 'Utilities stay outside React so they remain easy to reuse and test.',
        },
        {
          name: 'react-router-dom',
          message: 'Utilities stay outside routing.',
        },
        {
          name: 'sonner',
          message: 'Utilities do not trigger UI side effects.',
        },
      ],
      patterns: [
        {
          group: ['@/components', '@/components/*'],
          message: 'Utilities do not render UI.',
        },
        {
          group: ['@/pages', '@/pages/*'],
          message: 'Utilities do not depend on page orchestration.',
        },
      ],
    }),
  },
  {
    name: 'architecture/api-stays-out-of-ui',
    files: ['client-api/**/*.{ts,tsx}'],
    rules: restrictImports({
      paths: [
        {
          name: 'react',
          message: 'The API layer stays outside React.',
        },
        {
          name: 'react-router-dom',
          message: 'The API layer stays outside routing.',
        },
        {
          name: 'sonner',
          message: 'The API layer must not trigger toasts.',
        },
      ],
      patterns: [
        {
          group: ['@/components', '@/components/*'],
          message: 'The API layer must not depend on UI.',
        },
        {
          group: ['@/pages', '@/pages/*'],
          message: 'The API layer must not depend on page orchestration.',
        },
      ],
    }),
  },
  {
    name: 'project/tests-and-tooling',
    files: ['tests/**/*.{ts,tsx}', '**/*.config.{js,ts}', 'eslint.config.js'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
