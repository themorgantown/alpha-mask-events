// jest.setup.js
// Polyfill CanvasRenderingContext2D for jsdom tests
class CanvasRenderingContext2D {}
CanvasRenderingContext2D.prototype.drawImage = function() {};

// Expose in global and window
if (!global.window) global.window = {};
global.CanvasRenderingContext2D = CanvasRenderingContext2D;
global.window.CanvasRenderingContext2D = CanvasRenderingContext2D;

// Stub canvas getContext to provide drawImage and getImageData
if (typeof global.HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(type) {
    return {
      drawImage: () => {},
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(255) })
    };
  };
}
