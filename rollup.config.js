import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

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
    plugins: [ resolve(), commonjs(), terser() ] // Minified version
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
    plugins: [ resolve(), commonjs(), terser() ] // Minified version
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
    plugins: [ resolve(), commonjs(), terser() ] // Minified version
  }
];