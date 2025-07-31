/**
 * Jest configuration for ES modules
 * Following recommendations from https://jestjs.io/docs/ecmascript-modules
 */
export default {
  // Use jsdom environment for browser-like tests
  testEnvironment: 'jsdom',
  
  // Polyfill CanvasRenderingContext2D before tests
  setupFiles: ['<rootDir>/jest.setup.js'],
  
  // Mock image imports and canvas module in tests
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg|webp|avif|bmp|tiff|ico)$': '<rootDir>/__tests__/__mocks__/fileMock.js',
    '^canvas$': '<rootDir>/__tests__/__mocks__/canvasMock.js'
  },

  // Process environment for ESM compatibility
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/__mocks__/', '/__tests__/fixtures/', '/__tests__/emoji-summary-reporter.js'],
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'json', 'node'],
  
  // Allow transforms on all packages, important for ES modules
  transformIgnorePatterns: [],
  
  // Transform is not needed since we're using native ESM
  transform: {},
  
  // Enable verbose output for better debugging
  verbose: true,
  
  // Set reasonable timeouts for async tests
  testTimeout: 15000,
  
  // Custom reporters for better output
  reporters: [
    'default',
    '<rootDir>/__tests__/emoji-summary-reporter.js'
  ],
  
  // Coverage configuration with emojis
  coverageReporters: ['text', 'text-summary', 'html'],
  collectCoverageFrom: [
    'src/**/*.js',
    'bin/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ]
};