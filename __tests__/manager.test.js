// Polyfill jest not needed; stub drawImage manually
import Manager from '../src/manager.js';

// Create a more complete testing environment
describe('Manager', () => {
  let mgr;
  let originalImage;
  let originalDrawImage;
  
  beforeAll(() => {
    // Save original methods
    originalImage = window.Image;
    originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    
    // Mock the Image constructor
    window.Image = class MockImage {
      constructor() {
        this.onload = null;
        this.onerror = null;
        this.src = '';
        this.crossOrigin = null;
        this.naturalWidth = 10;
        this.naturalHeight = 10;
        
        // Trigger onload asynchronously when src is set
        Object.defineProperty(this, 'src', {
          set(value) {
            this._src = value;
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
    
    // Stub canvas drawImage method
    CanvasRenderingContext2D.prototype.drawImage = function() {};
  });
  
  afterAll(() => {
    // Restore original methods
    window.Image = originalImage;
    CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
  });
  
  beforeEach(() => {
    document.body.innerHTML = '';
    mgr = new Manager({ threshold: 0.5, log: false });
  });
  
  // Function to wait for registry updates
  function waitForRegistry(mgr, expectedLength, timeout = 500) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        if (mgr.registry.length === expectedLength) return resolve();
        if (Date.now() - start > timeout) return reject(
          new Error(`Timeout waiting for registry to reach length ${expectedLength}, current: ${mgr.registry.length}`)
        );
        setTimeout(check, 10);
      })();
    });
  }

  test('add and remove element', async () => {
    const el = document.createElement('img');
    el.className = 'alpha-mask-events';
    el.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9p6Q2wAAAABJRU5ErkJggg==';
    document.body.appendChild(el);
    
    mgr.add(el);
    await waitForRegistry(mgr, 1);
    
    expect(mgr.registry.length).toBe(1);
    expect(mgr.registry[0].el).toBe(el);
    
    mgr.remove(el);
    expect(mgr.registry.length).toBe(0);
  });

  test('setThreshold updates all registry entries', async () => {
    const el = document.createElement('img');
    el.className = 'alpha-mask-events';
    el.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9p6Q2wAAAABJRU5ErkJggg==';
    document.body.appendChild(el);
    
    mgr.add(el);
    await waitForRegistry(mgr, 1);
    
    mgr.setThreshold(0.1);
    expect(mgr.registry[0].threshold).toBe(0.1);
  });

  test('scan registers all .alpha-mask-events elements', async () => {
    const el1 = document.createElement('img');
    el1.className = 'alpha-mask-events';
    el1.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9p6Q2wAAAABJRU5ErkJggg==';
    
    const el2 = document.createElement('img');
    el2.className = 'alpha-mask-events';
    el2.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9p6Q2wAAAABJRU5ErkJggg==';
    
    document.body.appendChild(el1);
    document.body.appendChild(el2);
    
    mgr.scan();
    await waitForRegistry(mgr, 2);
    
    expect(mgr.registry.length).toBe(2);
    expect(mgr.registry.some(r => r.el === el1)).toBe(true);
    expect(mgr.registry.some(r => r.el === el2)).toBe(true);
  });
  
  // Test pointer events handlers
  test('pointer events handling', () => {
    expect(typeof mgr._onPointerEvent).toBe('function');
    expect(typeof mgr._hitTest).toBe('function');
  });
});