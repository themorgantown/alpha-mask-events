module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Allow expressions like mgr && mgr.remove(target)
    'no-unused-expressions': 'off',
  },
  // Completely disable TypeScript ESLint plugin rules
  plugins: [],
  overrides: [
    {
      files: ["**/*.js", "**/*.mjs"],
      rules: {
        '@typescript-eslint/no-unused-expressions': 'off',
        // Disable all TypeScript-specific rules
        '@typescript-eslint/*': 'off'
      }
    }
  ]
};
