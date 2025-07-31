// Test image format support and detection
/**
 * @jest-environment jsdom
 */
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import Manager from '../src/manager.js';

// Mock global DOM objects that might not be available
global.HTMLCanvasElement = global.HTMLCanvasElement || class HTMLCanvasElement {
  getContext() {
    return {
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(400) })),
      drawImage: jest.fn(),
      clearRect: jest.fn()
    };
  }
};

global.Image = global.Image || class Image {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.crossOrigin = '';
    this.width = 100;
    this.height = 100;
  }
};

describe('🖼️  Image Format Support (Browser)', () => {
  let mgr;
  let mockImg;
  let mockCanvas;
  let mockCtx;
  let originalImage;
  let originalCreateElement;

  beforeEach(() => {
    // Mock Image constructor
    originalImage = global.Image;
    mockImg = {
      onload: null,
      onerror: null,
      src: '',
      crossOrigin: '',
      width: 100,
      height: 100
    };
    
    global.Image = jest.fn(() => mockImg);

    // Mock Canvas and Context
    mockCtx = {
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4) // 100x100 RGBA
      })),
      drawImage: jest.fn(),
      clearRect: jest.fn()
    };

    mockCanvas = {
      getContext: jest.fn(() => mockCtx),
      width: 100,
      height: 100
    };

    // Mock createElement to return our mock canvas
    originalCreateElement = document.createElement;
    document.createElement = jest.fn((tag) => {
      if (tag === 'canvas') return mockCanvas;
      if (tag === 'img') {
        const img = originalCreateElement.call(document, tag);
        // Add any additional mock properties if needed
        return img;
      }
      if (tag === 'div') {
        const div = originalCreateElement.call(document, tag);
        // Add any additional mock properties if needed
        return div;
      }
      return originalCreateElement.call(document, tag);
    });

    mgr = new Manager({ log: true });
  });

  afterEach(() => {
    global.Image = originalImage;
    document.createElement = originalCreateElement;
    mgr.detachListeners();
    jest.restoreAllMocks();
  });

  describe('🎯 Format Detection & Registration', () => {
    const testFormats = [
      { ext: 'png', filename: 'transparent.png', supported: true, hasAlpha: true, emoji: '🌟' },
      { ext: 'webp', filename: 'transparent.webp', supported: true, hasAlpha: true, emoji: '🚀' },
      { ext: 'avif', filename: 'transparent.avif', supported: true, hasAlpha: true, emoji: '⚡' },
      { ext: 'gif', filename: 'transparent.gif', supported: true, hasAlpha: 'limited', emoji: '🎭' },
      { ext: 'jpg', filename: 'opaque.jpg', supported: true, hasAlpha: false, emoji: '📷' },
      { ext: 'jpeg', filename: 'opaque.jpeg', supported: true, hasAlpha: false, emoji: '📷' },
      { ext: 'bmp', filename: 'opaque.bmp', supported: true, hasAlpha: false, emoji: '🖼️' },
      { ext: 'tiff', filename: 'opaque.tiff', supported: true, hasAlpha: 'limited', emoji: '📸' },
      { ext: 'svg', filename: 'icon.svg', supported: true, hasAlpha: true, emoji: '🎨' },
      { ext: 'unknown', filename: 'file.unknown', supported: false, hasAlpha: false, emoji: '❓' }
    ];

    testFormats.forEach(({ ext, filename, supported, hasAlpha, emoji }) => {
      test(`${emoji} should ${supported ? 'detect and register' : 'handle'} ${ext.toUpperCase()} format correctly`, () => {
        const img = document.createElement('img');
        img.src = `__tests__/fixtures/${filename}`;
        img.className = 'alpha-mask-events';
        document.body.appendChild(img);

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        mgr.add(img);
        
        if (supported) {
          // Should register the element
          expect(mgr.registry.has(img)).toBe(true);
          
          if (hasAlpha === false) {
            // Should warn about lack of transparency
            expect(consoleSpy).toHaveBeenCalledWith(
              expect.stringContaining('does not support transparency')
            );
          }
        } else {
          // Should still register but with warnings
          expect(mgr.registry.has(img)).toBe(true);
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Unsupported or unknown format')
          );
        }
        
        document.body.removeChild(img);
        consoleSpy.mockRestore();
      });
    });

    test('🔗 should detect format with query parameters', () => {
      const img = document.createElement('img');
      img.src = '__tests__/fixtures/transparent.webp?v=123&size=large';
      img.className = 'alpha-mask-events';
      document.body.appendChild(img);

      mgr.add(img);
      
      // Should register despite query params
      expect(mgr.registry.has(img)).toBe(true);
      
      document.body.removeChild(img);
    });

    test('🔗 should detect format with URL fragments', () => {
      const img = document.createElement('img');
      img.src = '__tests__/fixtures/transparent.avif#section1';
      img.className = 'alpha-mask-events';
      document.body.appendChild(img);

      mgr.add(img);
      
      // Should register despite fragment
      expect(mgr.registry.has(img)).toBe(true);
      
      document.body.removeChild(img);
    });
  });

  describe('Background Image Format Support', () => {
    const backgroundFormats = [
      { filename: 'transparent.webp', format: 'WebP' },
      { filename: 'transparent.avif', format: 'AVIF' },
      { filename: 'transparent.png', format: 'PNG' },
      { filename: 'icon.svg', format: 'SVG' },
      { filename: 'opaque.jpg', format: 'JPEG' }
    ];

    backgroundFormats.forEach(({ filename, format }) => {
      test(`should support ${format} background images`, () => {
        const div = document.createElement('div');
        div.style.backgroundImage = `url("__tests__/fixtures/${filename}")`;
        div.className = 'alpha-mask-events';
        document.body.appendChild(div);

        mgr.add(div);
        
        expect(mgr.registry.has(div)).toBe(true);
        
        document.body.removeChild(div);
      });
    });

    test('should handle single quotes in background URLs', () => {
      const div = document.createElement('div');
      div.style.backgroundImage = "url('__tests__/fixtures/transparent.webp')";
      div.className = 'alpha-mask-events';
      document.body.appendChild(div);

      mgr.add(div);
      
      expect(mgr.registry.has(div)).toBe(true);
      
      document.body.removeChild(div);
    });

    test('should handle no quotes in background URLs', () => {
      const div = document.createElement('div');
      div.style.backgroundImage = 'url(__tests__/fixtures/transparent.webp)';
      div.className = 'alpha-mask-events';
      document.body.appendChild(div);

      mgr.add(div);
      
      expect(mgr.registry.has(div)).toBe(true);
      
      document.body.removeChild(div);
    });
  });

  describe('Error Handling', () => {
    test('should provide format-specific error messages for WebP', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      const img = document.createElement('img');
      img.src = 'test-image.webp';
      img.className = 'alpha-mask-events';
      document.body.appendChild(img);

      mgr.add(img);
      
      // Simulate image load error
      if (mockImg.onerror) {
        mockImg.onerror(new Event('error'));
      }
      
      // Should log WebP-specific advice
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebP: Ensure browser supports WebP')
      );
      
      document.body.removeChild(img);
      consoleSpy.mockRestore();
    });

    test('should provide format-specific error messages for AVIF', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      const img = document.createElement('img');
      img.src = 'test-image.avif';
      img.className = 'alpha-mask-events';
      document.body.appendChild(img);

      mgr.add(img);
      
      // Simulate image load error
      if (mockImg.onerror) {
        mockImg.onerror(new Event('error'));
      }
      
      // Should log AVIF-specific advice
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AVIF: Requires very recent browser')
      );
      
      document.body.removeChild(img);
      consoleSpy.mockRestore();
    });

    test('should warn about formats without transparency', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const img = document.createElement('img');
      img.src = 'test-image.jpg';
      img.className = 'alpha-mask-events';
      document.body.appendChild(img);

      mgr.add(img);
      
      // Should warn about lack of transparency
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('JPG format does not support transparency')
      );
      
      document.body.removeChild(img);
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Optimization by Format', () => {
    test('should log browser support warnings for modern formats', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const img = document.createElement('img');
      img.src = 'test-image.webp';
      img.className = 'alpha-mask-events';
      document.body.appendChild(img);

      mgr.add(img);
      
      // Should log format capabilities
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Detected format: WEBP')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Browser: modern')
      );
      
      document.body.removeChild(img);
      consoleSpy.mockRestore();
    });
  });
});
