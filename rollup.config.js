import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

// Enhanced terser options for production optimization
const terserOptions = {
  compress: {
    drop_console: true,        // Remove console.log statements
    drop_debugger: true,       // Remove debugger statements
    pure_funcs: ['console.log', 'console.warn', 'console.info', 'console.error'], // Mark as side-effect free
    unsafe: true,              // Enable unsafe optimizations
    unsafe_math: true,         // Optimize math operations
    passes: 3                  // Multiple optimization passes
  },
  mangle: {
    properties: {
      regex: /^_/               // Mangle private properties starting with _
    }
  }
};

export default [
  // ES module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named' // Fix for mixed exports warning
    },
    plugins: [ resolve(), commonjs() ] // Non-minified version
  },
  // ES module build (minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.min.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [ resolve(), commonjs(), terser(terserOptions) ] // Minified version with optimization
  },
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named' // Fix for mixed exports warning
    },
    plugins: [ resolve(), commonjs() ] // Non-minified version
  },
  // CommonJS build (minified)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.cjs.min.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [ resolve(), commonjs(), terser(terserOptions) ] // Minified version with optimization
  },
  // UMD build (for CDN, browsers)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/alpha-mask-events.umd.js',
      format: 'umd',
      name: 'AlphaMaskEvents', // Global variable name when used in browser
      exports: 'named',
      sourcemap: true
    },
    plugins: [ resolve(), commonjs() ] // Non-minified version
  },
  // UMD build (for CDN, browsers) - minified
  {
    input: 'src/index.js',
    output: {
      file: 'dist/alpha-mask-events.umd.min.js',
      format: 'umd',
      name: 'AlphaMaskEvents', // Global variable name when used in browser
      exports: 'named',
      sourcemap: true
    },
    plugins: [ resolve(), commonjs(), terser(terserOptions) ] // Minified version with optimization
  }
];