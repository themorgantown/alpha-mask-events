import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  // Browser library source
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser
      }
    },
    rules: {
      // Allow expressions like `mgr && mgr.remove(target)`
      'no-unused-expressions': 'off'
    }
  },
  // Node.js CLI / tooling
  {
    files: ['bin/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-expressions': 'off'
    }
  }
];
