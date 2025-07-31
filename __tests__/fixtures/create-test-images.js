#!/usr/bin/env node
/**
 * Generate test images for alpha-mask-events testing
 * Run with: node __tests__/fixtures/create-test-images.js
 */

import fs from 'fs';
import { createCanvas } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a PNG with checkerboard transparency pattern
 */
function createTransparentPNG(width = 100, height = 100) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  const squareSize = 10;
  
  for (let x = 0; x < width; x += squareSize) {
    for (let y = 0; y < height; y += squareSize) {
      const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
      
      if (isEven) {
        // Opaque red square
        ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';
      } else {
        // Semi-transparent blue square
        ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
      }
      
      ctx.fillRect(x, y, squareSize, squareSize);
    }
  }
  
  return canvas;
}

/**
 * Create a complex transparency pattern with gradients
 */
function createComplexTransparency(width = 200, height = 200) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create radial gradient with transparency
  const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
  gradient.addColorStop(0, 'rgba(255, 255, 0, 1.0)'); // Opaque yellow center
  gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.7)'); // Semi-transparent magenta
  gradient.addColorStop(1, 'rgba(0, 255, 255, 0.0)'); // Transparent cyan edge
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add some opaque shapes
  ctx.fillStyle = 'rgba(0, 255, 0, 1.0)'; // Opaque green
  ctx.beginPath();
  ctx.arc(50, 50, 20, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'; // Semi-transparent red
  ctx.fillRect(150, 150, 40, 40);
  
  return canvas;
}

/**
 * Create a solid opaque image
 */
function createOpaqueImage(width = 100, height = 100, color = 'blue') {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  return canvas;
}

/**
 * Create simple SVG with transparency
 */
function createTransparentSVG() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <!-- Opaque background circle -->
  <circle cx="50" cy="50" r="40" fill="red" opacity="1.0"/>
  
  <!-- Semi-transparent overlay rectangle -->
  <rect x="25" y="25" width="50" height="50" fill="blue" opacity="0.5"/>
  
  <!-- Fully transparent (invisible) circle -->
  <circle cx="75" cy="25" r="15" fill="green" opacity="0.0"/>
</svg>`;
}

async function generateTestImages() {
  console.log('🎨 Generating test images for alpha-mask-events...');
  
  try {
    // 1. Create transparent.png (checkerboard pattern)
    console.log('📸 Creating transparent.png...');
    const transparentCanvas = createTransparentPNG(100, 100);
    const transparentBuffer = transparentCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, 'transparent.png'), transparentBuffer);
    
    // 2. Create complex.png (complex transparency)
    console.log('📸 Creating complex.png...');
    const complexCanvas = createComplexTransparency(200, 200);
    const complexBuffer = complexCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, 'complex.png'), complexBuffer);
    
    // 3. Create opaque.png (no transparency)
    console.log('📸 Creating opaque.png...');
    const opaqueCanvas = createOpaqueImage(100, 100, 'blue');
    const opaqueBuffer = opaqueCanvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, 'opaque.png'), opaqueBuffer);
    
    // 4. Create icon.svg
    console.log('📸 Creating icon.svg...');
    const svgContent = createTransparentSVG();
    fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgContent, 'utf8');
    
    // Note: WebP and AVIF would require additional canvas configuration
    // For testing purposes, we can copy the PNG and rename it, or use conversion tools
    console.log('📸 Creating format variants...');
    
    // Copy PNG to create mock WebP/AVIF for testing (not actual conversion)
    // In a real scenario, you'd use imagemagick or sharp for proper conversion
    fs.copyFileSync(path.join(__dirname, 'transparent.png'), path.join(__dirname, 'transparent.webp'));
    fs.copyFileSync(path.join(__dirname, 'transparent.png'), path.join(__dirname, 'transparent.avif'));
    fs.copyFileSync(path.join(__dirname, 'transparent.png'), path.join(__dirname, 'transparent.gif'));
    
    // Create a simple JPEG (opaque)
    console.log('📸 Creating opaque.jpg...');
    const jpegCanvas = createOpaqueImage(100, 100, 'red');
    const jpegBuffer = jpegCanvas.toBuffer('image/jpeg', { quality: 0.9 });
    fs.writeFileSync(path.join(__dirname, 'opaque.jpg'), jpegBuffer);
    
    console.log('✅ Test images generated successfully!');
    console.log('');
    console.log('Generated files:');
    console.log('  - transparent.png (100x100, checkerboard pattern)');
    console.log('  - transparent.webp (copy of PNG for testing)');
    console.log('  - transparent.avif (copy of PNG for testing)');
    console.log('  - transparent.gif (copy of PNG for testing)');
    console.log('  - complex.png (200x200, complex transparency)');
    console.log('  - opaque.png (100x100, solid blue)');
    console.log('  - opaque.jpg (100x100, solid red)');
    console.log('  - icon.svg (100x100, SVG with transparency)');
    console.log('');
    console.log('💡 Note: WebP/AVIF files are PNG copies for testing.');
    console.log('   For production, use proper conversion tools like ImageMagick.');
    
  } catch (error) {
    console.error('❌ Error generating test images:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestImages();
}

export { createTransparentPNG, createComplexTransparency, createOpaqueImage, createTransparentSVG };
