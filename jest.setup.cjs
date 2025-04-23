// jest.setup.cjs

// Polyfill CanvasRenderingContext2D for jsdom tests
class CanvasRenderingContext2D {}
CanvasRenderingContext2D.prototype.drawImage = function() {};

// Expose in global and window
if (!global.window) global.window = {};
global.CanvasRenderingContext2D = CanvasRenderingContext2D;
global.window.CanvasRenderingContext2D = CanvasRenderingContext2D;
