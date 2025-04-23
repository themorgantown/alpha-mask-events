/**
 * Jest configuration for ES modules
 * Following recommendations from https://jestjs.io/docs/ecmascript-modules
 */
export default {
  // Use jsdom environment for browser-like tests
  testEnvironment: 'jsdom',
  
  // Polyfill CanvasRenderingContext2D before tests
  setupFiles: ['<rootDir>/jest.setup.js'],
  
  // Mock image imports in tests
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__tests__/__mocks__/fileMock.js'
  },
  
  // Process environment for ESM compatibility
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/__mocks__/', '/__tests__/fixtures/'],
  moduleFileExtensions: ['js', 'mjs', 'jsx', 'json', 'node'],
  
  // Allow transforms on all packages, important for ES modules
  transformIgnorePatterns: [],
  
  // Transform is not needed since we're using native ESM
  transform: {},
  
  // Enable verbose output for better debugging
  verbose: true,
  
  // Set reasonable timeouts for async tests
  testTimeout: 10000
};