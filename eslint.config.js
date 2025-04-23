import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        // Browser API globals that were causing linting errors
        getComputedStyle: 'readonly',
        ResizeObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        MutationObserver: 'readonly'
      }
    },
    rules: {
      // Allow expressions like mgr && mgr.remove(target)
      'no-unused-expressions': 'off'
    },
  },
];
