/**
 * Default transparency threshold - pixels with alpha less than or equal to this value
 * will be click-through. Set very close to 1 to make nearly transparent pixels click-through.
 */
const DEFAULT_THRESHOLD = 0.999;

/**
 * Manager class that handles the core functionality for alpha mask event processing.
 * 
 * This class maintains a registry of elements with alpha masks, processes pointer events,
 * and dynamically adjusts pointer-events CSS properties based on pixel transparency.
 */
export default class Manager {
  /**
   * Create a new Manager instance.
   * 
   * @param {Object} options - Configuration options
   * @param {number} [options.threshold=0.999] - Global transparency threshold (0-1)
   * @param {boolean} [options.log=false] - Enable debug logging
   */
  constructor({ threshold = DEFAULT_THRESHOLD, log = false } = {}) {
    this.threshold = threshold;
    this.log       = log;
    this.registry  = []; // Array of objects: { el, canvas, ctx, threshold, originalPointerEvents }
    this._handler  = this._onPointerEvent.bind(this);
    this._rafPending = false;       // Flag to prevent redundant animation frames
    this._lastEvent = null;         // Store most recent event for delayed processing
    this._mutationObserver = null;  // For observing DOM changes
    this._resizeObservers = new WeakMap(); // Track resize observers per element
  }

  /**
   * Scan the document for elements with the 'alpha-mask-events' class and register them.
   * Also sets up observation for future DOM changes to auto-register new elements.
   */
  scan() {
    document.querySelectorAll('.alpha-mask-events')
      .forEach(el => this.add(el));
    this._observeMutations();
  }

  /**
   * Register an element for alpha mask hit-testing.
   * 
   * This method prepares an element for transparent click-through behavior by:
   * 1. Loading the image (either from img.src or CSS background-image)
   * 2. Creating an offscreen canvas to analyze pixel transparency
   * 3. Storing the element in the registry for event processing
   * 4. Setting up resize observation to handle responsive layouts
   * 
   * @param {HTMLElement|string} elOrSelector - DOM element or CSS selector to register
   * @param {Object} opts - Configuration options for this specific element
   * @param {number} [opts.threshold] - Per-element transparency threshold (0-1)
   * @param {boolean} [opts.log] - Enable debug logging for this element
   * @returns {void}
   */
  add(elOrSelector, opts = {}) {
    const el = typeof elOrSelector === 'string'
      ? document.querySelector(elOrSelector)
      : elOrSelector;
    if (!el || this.registry.some(r => r.el === el)) return;
    const threshold = opts.threshold ?? this.threshold;
    let src, natW, natH;
    
    // Handle both <img> elements and elements with background-image
    if (el.tagName === 'IMG') {
      src = el.src;
      natW = el.naturalWidth;
      natH = el.naturalHeight;
    } else {
      const bg = getComputedStyle(el).backgroundImage.match(/url\(([^)]+)\)/);
      if (!bg) return;
      src = bg[1].replace(/['"]/g, '');
    }
    
    // Load the image to analyze its pixel data
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    
    img.onload = () => {
      // Create canvas for pixel data analysis
      const w = natW || img.naturalWidth;
      const h = natH || img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      
      // Store the original pointer-events value to restore it when needed
      this.registry.push({ el, canvas, ctx, threshold, originalPointerEvents: el.style.pointerEvents });
      if (this.log) console.log('AME: registered', el, threshold);
      
      // Observe element resize to maintain proper hit-testing when size changes
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => this._updateCanvas(el));
        ro.observe(el);
        this._resizeObservers.set(el, ro);
      }
    };
    
    img.onerror = (e) => {
      if (this.log) console.warn('AME: image load failed', src, e);
    };
  }

  /**
   * Unregister an element from alpha mask hit-testing.
   * 
   * Removes the element from the registry and cleans up any associated observers.
   * 
   * @param {HTMLElement|string} elOrSelector - DOM element or CSS selector to unregister
   */
  remove(elOrSelector) {
    const el = typeof elOrSelector === 'string'
      ? document.querySelector(elOrSelector)
      : elOrSelector;
    this.registry = this.registry.filter(entry => entry.el !== el);
    
    // Disconnect ResizeObserver if present to prevent memory leaks
    const ro = this._resizeObservers.get(el);
    if (ro) {
      ro.disconnect();
      this._resizeObservers.delete(el);
    }
  }

  /**
   * Set the transparency threshold for all registered elements.
   * 
   * Adjusts how transparent a pixel needs to be before clicks pass through.
   * Lower values (closer to 0) make fewer pixels click-through.
   * Higher values (closer to 1) make more pixels click-through.
   * 
   * @param {number} val - New threshold value (0-1)
   */
  setThreshold(val) {
    this.threshold = val;
    this.registry.forEach(r => r.threshold = val);
  }

  /**
   * Attach event listeners for pointer/touch events.
   * 
   * Sets up global document event listeners to process pointer events
   * for all registered elements. Uses modern PointerEvent API when available, 
   * falls back to TouchEvent API for older browsers.
   */
  attachListeners() {
    if (window.PointerEvent) {
      document.addEventListener('pointermove', this._handler, { passive: true });
      document.addEventListener('pointerdown', this._handler, { passive: true });
    } else {
      document.addEventListener('touchmove', this._handler, { passive: true });
      document.addEventListener('touchstart', this._handler, { passive: true });
    }
  }

  /**
   * Remove all event listeners and clean up observers.
   * 
   * Use this method when you want to completely disable the alpha mask functionality
   * or before disposing of the manager instance to prevent memory leaks.
   */
  detachListeners() {
    document.removeEventListener('pointermove', this._handler);
    document.removeEventListener('pointerdown', this._handler);
    document.removeEventListener('touchmove', this._handler);
    document.removeEventListener('touchstart', this._handler);
    
    // Clean up MutationObserver
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }
    
    // Clean up all ResizeObservers
    this._resizeObservers = new WeakMap();
  }

  /**
   * Handle pointer/touch events with performance optimization.
   * 
   * This method uses requestAnimationFrame to throttle processing during rapid
   * mouse movements, ensuring smooth performance even with many registered elements.
   * 
   * @param {PointerEvent|TouchEvent} e - The original DOM event
   * @private
   */
  _onPointerEvent(e) {
    this._lastEvent = e;
    
    // Only process events once per animation frame for performance
    if (!this._rafPending) {
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        this._hitTest(this._lastEvent);
      });
    }
  }

  /**
   * Performs the core hit-testing logic for transparent click-through.
   *
   * This is the heart of the library's functionality. For each registered element:
   * 1. It gets the exact pointer position
   * 2. Maps the screen coordinates to image coordinates
   * 3. Samples the alpha/transparency value at that exact pixel
   * 4. Dynamically sets pointer-events CSS to either:
   *    - 'none' (for transparent pixels): allowing events to pass through to elements beneath
   *    - 'auto' (for opaque pixels): keeping normal event behavior
   * 
   * This enables the "click-through keyhole" effect when elements are stacked on top of each other.
   *
   * @param {PointerEvent|TouchEvent} e - The pointer or touch event to process
   * @private
   */
  _hitTest(e) {
    let x, y;
    if (e.touches && e.touches.length) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    // Only test the element directly under the pointer to minimize work
    const topEl = document.elementFromPoint(x, y);
    this.registry.forEach(({ el, canvas, ctx, threshold, originalPointerEvents }) => {
      // If pointer is not over this element, restore original style
      if (!el.contains(topEl)) {
        el.style.pointerEvents = originalPointerEvents;
        return;
      }
      // Compute local pixel coords
      const rect = el.getBoundingClientRect();
      const px = Math.floor((x - rect.left) * canvas.width / rect.width);
      const py = Math.floor((y - rect.top) * canvas.height / rect.height);
      let alpha;
      try {
        alpha = ctx.getImageData(px, py, 1, 1).data[3] / 255;
      } catch (err) {
        if (this.log) console.warn('AME: getImageData failed', err);
        // On error, default to opaque
        alpha = 1;
      }
      // Apply threshold: transparent => click-through; opaque => block clicks
      el.style.pointerEvents = alpha <= threshold ? 'none' : 'auto';
    });
  }

  /**
   * Sets up a MutationObserver to automatically handle elements with the 'alpha-mask-events' class.
   * 
   * This observer watches for DOM changes and automatically:
   * - Registers new elements that have the 'alpha-mask-events' class
   * - Unregisters elements with that class when they're removed from the DOM
   * 
   * This enables dynamic behavior for single-page applications and dynamically modified content
   * without requiring manual registration for each DOM change.
   * 
   * @private
   */
  _observeMutations() {
    if (!('MutationObserver' in window)) return;
    if (this._mutationObserver) return;
    this._mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList.contains('alpha-mask-events')) {
            this.add(node);
          }
        });
        m.removedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList.contains('alpha-mask-events')) {
            this.remove(node);
          }
        });
      });
    });
    this._mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Refreshes the canvas for an element when its size changes.
   * 
   * This is used by the ResizeObserver to ensure alpha mask hit-testing 
   * remains accurate when elements are resized (such as in responsive layouts).
   * It works by removing and re-adding the element to recreate its canvas.
   * 
   * @param {HTMLElement} el - The element whose canvas needs updating
   * @private
   */
  _updateCanvas(el) {
    // Remove and re-add to refresh canvas
    this.remove(el);
    this.add(el);
  }
}