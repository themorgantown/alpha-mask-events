#!/usr/bin/env node

// Quick test to verify our fixes work
import { detectImageFormat, isSupportedImageFormat } from './bin/generate-masks.js';

console.log('🧪 Testing format detection functions...\n');

// Test detectImageFormat
console.log('📊 detectImageFormat tests:');
console.log('  PNG:', detectImageFormat('test.png')); // should be 'png'
console.log('  JPG:', detectImageFormat('test.jpg')); // should be 'jpg'
console.log('  WebP:', detectImageFormat('test.webp')); // should be 'webp'
console.log('  AVIF:', detectImageFormat('test.avif')); // should be 'avif'
console.log('  Unknown:', detectImageFormat('test.xyz')); // should be null

// Test isSupportedImageFormat
console.log('\n✅ isSupportedImageFormat tests:');
console.log('  PNG:', isSupportedImageFormat('test.png')); // should be true
console.log('  JPG:', isSupportedImageFormat('test.jpg')); // should be true
console.log('  WebP:', isSupportedImageFormat('test.webp')); // should be true
console.log('  SVG:', isSupportedImageFormat('test.svg')); // should be true
console.log('  Unknown:', isSupportedImageFormat('test.xyz')); // should be false

// Test with query params
console.log('\n🔗 URL parameter tests:');
console.log('  WebP with params:', detectImageFormat('image.webp?v=123')); // should be 'webp'
console.log('  AVIF with fragment:', detectImageFormat('image.avif#section1')); // should be 'avif'
console.log('  Support with params:', isSupportedImageFormat('image.webp?v=123')); // should be true

console.log('\n✨ Test complete!');
