// jest.setup.js
// Polyfill CanvasRenderingContext2D for jsdom tests
class CanvasRenderingContext2D {}
CanvasRenderingContext2D.prototype.drawImage = function() {};

// Expose in global and window
if (!global.window) global.window = {};
global.CanvasRenderingContext2D = CanvasRenderingContext2D;
global.window.CanvasRenderingContext2D = CanvasRenderingContext2D;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  disconnect() {}
};

// Stub canvas getContext to provide drawImage and getImageData
if (typeof global.HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(type, options) {
    return {
      drawImage: () => {},
      clearRect: () => {},
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) })
    };
  };
}
