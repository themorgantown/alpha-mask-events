// Explicitly import Jest functions for ES Module compatibility
import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
// Polyfill jest not needed; stub drawImage manually
import Manager from '../src/manager.js'; // Use default import

// Helper to wait for async operations like image loading affecting the registry
function waitForRegistrySize(mgr, expectedSize, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      // Use .size for Map
      if (mgr.registry.size === expectedSize) return resolve();
      if (Date.now() - start > timeout) return reject(
        new Error(`Timeout waiting for registry to reach size ${expectedSize}, current: ${mgr.registry.size}`)
      );
      setTimeout(check, 20); // Check again shortly
    })();
  });
}

// Helper to wait for entry.imageLoaded to be true
function waitForImageLoad(entry, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (entry && entry.imageLoaded) return resolve();
      if (Date.now() - start > timeout) return reject(
        new Error(`Timeout waiting for entry.imageLoaded to become true`)
      );
      setTimeout(check, 20); // Check again shortly
    })();
  });
}


// Create a more complete testing environment
describe('⚙️  Manager Core Functionality', () => {
  let mgr;
  let originalImage;
  // Store original canvas methods
  let originalGetContext;
  let originalClearRect;
  let originalDrawImage;
  let originalGetImageData;


  beforeAll(() => {
    // Save original methods
    originalImage = window.Image;
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
    originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;


    // Mock the Image constructor
    window.Image = class MockImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.src = '';
        this.crossOrigin = null;
        this.naturalWidth = 10; // Example dimensions
        this.naturalHeight = 10;
        this._src = '';


        // Trigger onload asynchronously when src is set
        Object.defineProperty(this, 'src', {
          set(value) {
            this._src = value;
            // Simulate async loading
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          },
          get() {
            return this._src;
          }
        });
      }
    };


    // Mock canvas methods needed by Manager
    HTMLCanvasElement.prototype.getContext = function(contextId, options) {
        if (contextId === '2d') {
            // Return a mock context object
            return {
                clearRect: jest.fn(), // Mock clearRect
                drawImage: jest.fn(), // Mock drawImage
                getImageData: jest.fn((x, y, sw, sh) => { // Mock getImageData
                    // Return plausible data structure (e.g., opaque pixel)
                    // RGBA format
                    return { data: new Uint8ClampedArray([0, 0, 0, 255]) };
                }),
                // Add other methods if needed by future tests
            };
        }
        // Fallback for other context types if necessary
        return originalGetContext ? originalGetContext.call(this, contextId, options) : null;
    };


    // Optional: If direct manipulation of prototype is needed (less common now with getContext mock)
    // CanvasRenderingContext2D.prototype.clearRect = jest.fn();
    // CanvasRenderingContext2D.prototype.drawImage = jest.fn();
    // CanvasRenderingContext2D.prototype.getImageData = jest.fn(() => ({ data: [0, 0, 0, 255] }));
  });


  afterAll(() => {
    // Restore original methods
    window.Image = originalImage;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    // Restore prototype methods if they were directly mocked
    // CanvasRenderingContext2D.prototype.clearRect = originalClearRect;
    // CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    // CanvasRenderingContext2D.prototype.getImageData = originalGetImageData;
  });


  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Clear the DOM
    document.body.innerHTML = '';
    // Create a new manager instance for isolation with logging and IntersectionObserver disabled to avoid timing issues
    mgr = new Manager({ 
      log: false, 
      useIntersectionObserver: false 
    });
  });

  test('➕ add and remove element', async () => {
    const div = document.createElement('div');
    div.id = 'test-div';
    // Simulate background image via style attribute for MutationObserver test later if needed
    div.style.backgroundImage = 'url(test.png)';
    document.body.appendChild(div);

    mgr.add('#test-div');

    // Wait for async image load and registration
    await waitForRegistrySize(mgr, 1);

    expect(mgr.registry.size).toBe(1);
    expect(mgr.registry.has(div)).toBe(true);
    expect(div.style.pointerEvents).toBe('none'); // Initial state

    // Verify the registry entry has the expected structure
    const entry = mgr.registry.get(div);
    expect(entry.isVisible).toBeDefined(); // Should be initialized
    expect(entry.imageLoaded).toBeDefined(); // Should be initialized

    mgr.remove('#test-div');
    expect(mgr.registry.size).toBe(0);
    // Check if original pointerEvents was restored (assuming it was empty initially)
    // If the original was something else, the mock needs to capture/restore it.
    // For now, we check if it's not 'none' anymore.
    expect(div.style.pointerEvents).not.toBe('none');
  });

  test('🎯 setThreshold updates all registry entries', async () => {
    const div1 = document.createElement('div');
    div1.id = 'div1';
    div1.style.backgroundImage = 'url(test1.png)';
    document.body.appendChild(div1);

    const div2 = document.createElement('div');
    div2.id = 'div2';
    div2.style.backgroundImage = 'url(test2.png)';
    document.body.appendChild(div2);

    mgr.add(div1);
    mgr.add(div2);

    await waitForRegistrySize(mgr, 2);

    expect(mgr.registry.get(div1).threshold).toBe(0.999); // Default
    expect(mgr.registry.get(div2).threshold).toBe(0.999); // Default

    mgr.setThreshold(0.5);

    expect(mgr.registry.get(div1).threshold).toBe(0.5);
    expect(mgr.registry.get(div2).threshold).toBe(0.5);

    // Test setting threshold for a specific element
    mgr.setThreshold(0.1, '#div1');
    expect(mgr.registry.get(div1).threshold).toBe(0.1);
    expect(mgr.registry.get(div2).threshold).toBe(0.5); // Should remain unchanged

  });

  test('🔍 scan registers all .alpha-mask-events elements', async () => {
    document.body.innerHTML = `
      <img src="img1.png" class="alpha-mask-events" id="img1" />
      <div style="background-image: url(div-bg.png)" class="alpha-mask-events" id="div1"></div>
      <p>Some other element</p>
      <img src="img2.png" id="img2" /> <!-- No class -->
    `;

    mgr.scan(); // Should pick up #img1 and #div1

    await waitForRegistrySize(mgr, 2);

    expect(mgr.registry.size).toBe(2);
    expect(mgr.registry.has(document.getElementById('img1'))).toBe(true);
    expect(mgr.registry.has(document.getElementById('div1'))).toBe(true);
    expect(mgr.registry.has(document.getElementById('img2'))).toBe(false); // Should not be registered
  });

  // Basic pointer event test (more detailed tests needed for hit-testing logic)
  test('pointer events handling', async () => {
     const div = document.createElement('div');
     div.id = 'interactive-div';
     div.style.backgroundImage = 'url(test.png)';
     div.style.width = '100px'; // Need dimensions for getBoundingClientRect
     div.style.height = '100px';
     document.body.appendChild(div);

     mgr.add(div);
     await waitForRegistrySize(mgr, 1);

     // Explicitly wait for the image loading simulation to complete
     const entry = mgr.registry.get(div);
     await waitForImageLoad(entry); // Wait for entry.imageLoaded === true

     // Mock getBoundingClientRect for the element AFTER image load wait
     const mockRect = { top: 10, left: 10, bottom: 110, right: 110, width: 100, height: 100 };
     jest.spyOn(div, 'getBoundingClientRect').mockReturnValue(mockRect);

     // Create a new mock context specifically for checking getImageData calls
     const mockGetImageData = jest.fn((x, y, sw, sh) => {
       return { data: new Uint8ClampedArray([0, 0, 0, 255]) }; // Opaque pixel
     });
     const mockCtx = {
       // Include other methods if Manager calls them, ensure they are jest.fn()
       clearRect: jest.fn(),
       drawImage: jest.fn(),
       getImageData: mockGetImageData,
     };
     const mockCanvas = {
       width: mockRect.width,
       height: mockRect.height,
       getContext: () => mockCtx, // If getContext is called again (unlikely here)
     };

     // Inject the mocks into the registry entry AFTER image load wait
     entry.ctx = mockCtx;
     entry.canvas = mockCanvas;

     // Simulate pointer move over the element
     const pointerMoveEvent = { clientX: 50, clientY: 50 };

     mgr._hitTest(pointerMoveEvent);

     // Assertions
     expect(mockGetImageData).toHaveBeenCalled();
     expect(mockGetImageData).toHaveBeenCalledWith(40, 40, 1, 1); // (50-10)*canvasW/rectW, (50-10)*canvasH/rectH
     expect(div.style.pointerEvents).toBe('auto'); // Should be interactive (alpha > threshold)

     // Simulate pointer move outside
     const pointerMoveOutside = { clientX: 200, clientY: 200 };
     mgr._hitTest(pointerMoveOutside);
     expect(div.style.pointerEvents).toBe(entry.originalPointerEvents); // Should restore original

     // Restore mocks specifically spied on this element
     jest.restoreAllMocks(); // Cleans up spies like getBoundingClientRect
  });

  test('IntersectionObserver integration works correctly', async () => {
    // Create a manager with IntersectionObserver enabled
    const mgrWithIO = new Manager({ log: false, useIntersectionObserver: true });

    const div = document.createElement('div');
    div.id = 'test-intersection';
    div.style.backgroundImage = 'url(test.png)';
    div.style.pointerEvents = 'none'; // Set initial pointer events
    document.body.appendChild(div);

    // Spy on IntersectionObserver methods BEFORE calling scan()
    const observeSpy = jest.spyOn(global.IntersectionObserver.prototype, 'observe');
    const unobserveSpy = jest.spyOn(global.IntersectionObserver.prototype, 'unobserve');

    // This should set up IntersectionObserver
    mgrWithIO.scan(); 

    // Now add the element - this should call observe after image loads
    mgrWithIO.add(div);
    await waitForRegistrySize(mgrWithIO, 1);

    // Wait for the image to load, which triggers IntersectionObserver.observe()
    const entry = mgrWithIO.registry.get(div);
    await waitForImageLoad(entry);

    expect(entry.isVisible).toBe(true); // Should be visible initially

    // Verify IntersectionObserver was used after image loaded
    expect(observeSpy).toHaveBeenCalledWith(div);

    // Test removal also unobserves
    mgrWithIO.remove(div);
    expect(unobserveSpy).toHaveBeenCalledWith(div);
    expect(mgrWithIO.registry.size).toBe(0);

    // Clean up
    mgrWithIO.detachListeners();
    jest.restoreAllMocks();
  });

});