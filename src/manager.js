/**
 * Default transparency threshold - pixels with alpha less than or equal to this value
 * will be click-through. Set very close to 1 to make nearly transparent pixels click-through.
 */
const DEFAULT_THRESHOLD = 0.999; // Pixels with alpha > this are considered opaque

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
   * @param {number} [options.threshold=0.999] - Global transparency threshold (0-1). Alpha values *strictly greater* than this are considered opaque.
   * @param {boolean} [options.log=false] - Enable debug logging
   */
  constructor({ threshold = DEFAULT_THRESHOLD, log = false } = {}) {
    this.threshold = threshold;
    this.log       = log;
    // Registry stores: { el, canvas, ctx, threshold, originalPointerEvents, img, imageLoaded, currentSrc }
    this.registry  = new Map(); // Use Map for easier element lookup/removal
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
   * @param {HTMLElement|string} elOrSelector - DOM element or CSS selector to register
   * @param {Object} opts - Configuration options for this specific element
   * @param {number} [opts.threshold] - Per-element transparency threshold (0-1)
   * @returns {void}
   */
  add(elOrSelector, opts = {}) {
    const el = typeof elOrSelector === 'string'
      ? document.querySelector(elOrSelector)
      : elOrSelector;

    if (!el || !(el instanceof HTMLElement) || this.registry.has(el)) {
        if (this.log && el && this.registry.has(el)) console.log('AME: Element already registered', el);
        else if (this.log && !el) console.warn('AME: Element not found for selector', elOrSelector);
        else if (this.log) console.warn('AME: Invalid element provided', el);
        return;
    }

    const threshold = opts.threshold ?? this.threshold;
    const computedStyle = getComputedStyle(el);
    let src;

    // Determine image source (img.src or background-image)
    if (el.tagName === 'IMG') {
      src = el.currentSrc || el.src; // Use currentSrc for responsive images
    } else {
      const bg = computedStyle.backgroundImage;
      const match = bg.match(/url\((['"]?)(.*?)\1\)/); // More robust regex
      if (!match || !match[2]) {
          if (this.log) console.warn('AME: No background-image URL found for element', el);
          return;
      }
      src = match[2];
    }

    if (!src) {
        if (this.log) console.warn('AME: Could not determine image source for element', el);
        return;
    }

    // Create canvas and context immediately
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
        console.error('AME: Failed to get 2D context for canvas. Alpha masking disabled for element.', el);
        return;
    }

    // Store original pointer-events and set to 'none' initially
    const originalPointerEvents = el.style.pointerEvents || computedStyle.pointerEvents; // Get computed if not inline
    el.style.pointerEvents = 'none'; // Start as non-interactive

    // Prepare registry entry
    const entry = {
        el,
        canvas,
        ctx,
        threshold,
        originalPointerEvents,
        img: null, // Image object will be loaded
        imageLoaded: false,
        currentSrc: src
    };
    this.registry.set(el, entry);
    if (this.log) console.log('AME: Registering element', el, 'with src:', src, 'threshold:', threshold);


    // Load the image
    const img = new window.Image();
    img.crossOrigin = 'Anonymous'; // Attempt anonymous CORS
    img.onload = () => {
        if (this.log) console.log('AME: Image loaded successfully for', el, src);
        entry.img = img;
        entry.imageLoaded = true;
        // Initial canvas draw now that image is loaded
        this._drawBackgroundToCanvas(entry);

        // Setup ResizeObserver only after image is loaded and canvas is ready
        if ('ResizeObserver' in window) {
            const ro = new ResizeObserver(() => this._updateCanvas(entry));
            ro.observe(el);
            this._resizeObservers.set(el, ro);
        } else {
            if (this.log) console.warn('AME: ResizeObserver not supported. Layout changes might affect accuracy.');
        }
    };
    img.onerror = (e) => {
        console.error('AME: Image load failed for element', el, 'src:', src, e);
        // Clean up if image fails to load
        this.remove(el);
    };
    img.src = src; // Start loading
  }

  /**
   * Unregister an element from alpha mask hit-testing.
   *
   * @param {HTMLElement|string} elOrSelector - DOM element or CSS selector to unregister
   */
  remove(elOrSelector) {
    const el = typeof elOrSelector === 'string'
      ? document.querySelector(elOrSelector)
      : elOrSelector;

    if (!el || !this.registry.has(el)) {
        if (this.log && !el) console.warn('AME: Element not found for removal', elOrSelector);
        else if (this.log) console.log('AME: Element not registered, cannot remove', el);
        return;
    }

    const entry = this.registry.get(el);

    // Restore original pointer-events
    el.style.pointerEvents = entry.originalPointerEvents;

    // Disconnect ResizeObserver
    const ro = this._resizeObservers.get(el);
    if (ro) {
      ro.disconnect();
      this._resizeObservers.delete(el);
    }

    // Remove from registry
    this.registry.delete(el);
    if (this.log) console.log('AME: Unregistered element', el);

    // If no elements left, consider detaching global listeners (optional optimization)
    // if (this.registry.size === 0) {
    //   this.detachListeners();
    // }
  }

  /**
   * Set the transparency threshold for all registered elements or a specific one.
   *
   * @param {number} val - New threshold value (0-1)
   * @param {HTMLElement|string} [elOrSelector] - Optional element or selector to target
   */
  setThreshold(val, elOrSelector) {
      const threshold = Math.max(0, Math.min(1, val)); // Clamp between 0 and 1

      if (elOrSelector) {
          const el = typeof elOrSelector === 'string'
              ? document.querySelector(elOrSelector)
              : elOrSelector;
          if (el && this.registry.has(el)) {
              this.registry.get(el).threshold = threshold;
              if (this.log) console.log('AME: Updated threshold for specific element', el, threshold);
          } else if (this.log) {
              console.warn('AME: Element not found or not registered for setThreshold', elOrSelector);
          }
      } else {
          this.threshold = threshold; // Update global default
          this.registry.forEach(entry => {
              entry.threshold = threshold; // Update all existing entries
          });
          if (this.log) console.log('AME: Updated global threshold', threshold);
      }
  }


  /**
   * Attach global event listeners for pointer events.
   */
  attachListeners() {
    // Check if listeners are already attached (simple check)
    if (this._listenersAttached) return;

    // Use pointer events if available, fallback to mouse/touch
    if (window.PointerEvent) {
      document.addEventListener('pointermove', this._handler, { passive: true });
      // We might need pointerdown too if interaction changes state immediately
      // document.addEventListener('pointerdown', this._handler, { passive: true });
    } else {
      document.addEventListener('mousemove', this._handler, { passive: true });
      document.addEventListener('touchmove', this._handler, { passive: true });
      // document.addEventListener('mousedown', this._handler, { passive: true });
      // document.addEventListener('touchstart', this._handler, { passive: true });
    }
    this._listenersAttached = true;
    if (this.log) console.log('AME: Attached global listeners');
  }

  /**
   * Remove all global event listeners and clean up observers.
   */
  detachListeners() {
    if (!this._listenersAttached) return;

    if (window.PointerEvent) {
      document.removeEventListener('pointermove', this._handler);
      // document.removeEventListener('pointerdown', this._handler);
    } else {
      document.removeEventListener('mousemove', this._handler);
      document.removeEventListener('touchmove', this._handler);
      // document.removeEventListener('mousedown', this._handler);
      // document.removeEventListener('touchstart', this._handler);
    }

    // Clean up MutationObserver
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }

    // Clean up all ResizeObservers and remove elements from registry
    this.registry.forEach((entry, el) => {
        this.remove(el); // Use remove to handle cleanup logic
    });
    // Ensure registry and observer map are clear
    this.registry.clear();
    this._resizeObservers = new WeakMap(); // Re-initialize

    this._listenersAttached = false;
    if (this.log) console.log('AME: Detached global listeners and cleaned up observers/registry');
  }

  /**
   * Handle pointer/touch/mouse events with performance optimization (RAF throttling).
   *
   * @param {Event} e - The original DOM event (PointerEvent, MouseEvent, TouchEvent)
   * @private
   */
  _onPointerEvent(e) {
    this._lastEvent = e; // Store the latest event

    if (!this._rafPending) {
      this._rafPending = true;
      requestAnimationFrame(() => {
        this._rafPending = false;
        if (this._lastEvent) { // Ensure an event exists
            this._hitTest(this._lastEvent);
        }
      });
    }
  }

  /**
   * Performs the core hit-testing logic. Iterates through registered elements,
   * checks if the pointer is within bounds, samples the alpha value from the
   * internal canvas, and sets pointer-events accordingly.
   *
   * @param {Event} e - The pointer, touch, or mouse event to process
   * @private
   */
  _hitTest(e) {
    let clientX, clientY;

    // Extract coordinates consistently
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (typeof e.clientX !== 'undefined' && typeof e.clientY !== 'undefined') {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      // Event type doesn't have coordinates we can use
      return;
    }

    // Iterate through registered elements
    this.registry.forEach((entry) => {
        const { el, canvas, ctx, threshold, originalPointerEvents, imageLoaded } = entry;

        // Skip if image hasn't loaded yet or canvas context failed
        if (!imageLoaded || !ctx) {
            // Ensure pointerEvents remains 'none' until ready
            if (el.style.pointerEvents !== 'none') {
                el.style.pointerEvents = 'none';
            }
            return;
        }

        const rect = el.getBoundingClientRect();

        // Check if pointer is within the element's bounding box
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            // Pointer is inside the element bounds, perform alpha check

            // Map screen coordinates to canvas coordinates
            // This assumes the canvas content accurately reflects the rendered background
            const canvasX = Math.floor((clientX - rect.left) * (canvas.width / rect.width));
            const canvasY = Math.floor((clientY - rect.top) * (canvas.height / rect.height));

            let alpha = 0; // Default to transparent if sampling fails
            // Ensure coordinates are within canvas bounds before sampling
            if (canvasX >= 0 && canvasX < canvas.width && canvasY >= 0 && canvasY < canvas.height) {
                try {
                    // Sample the alpha value from the corresponding pixel on the internal canvas
                    const pixelData = ctx.getImageData(canvasX, canvasY, 1, 1).data;
                    alpha = pixelData[3] / 255; // Alpha is the 4th component (0-255)
                } catch (err) {
                    // This can happen due to CORS issues if crossOrigin='anonymous' isn't respected
                    // or if coordinates are somehow out of bounds despite checks.
                    if (this.log && !entry._loggedImageDataError) { // Log only once per element
                        console.warn('AME: getImageData failed for element. Tainted canvas? CORS issue?', el, err);
                        entry._loggedImageDataError = true; // Prevent spamming logs
                    }
                    // Default to opaque on error to avoid unexpected click-through
                    alpha = 1.0;
                }
            } else {
                 if (this.log) console.log('AME: Calculated coords outside canvas bounds', { canvasX, canvasY, canvasW: canvas.width, canvasH: canvas.height });
                 // Treat as transparent if outside calculated canvas bounds
                 alpha = 0;
            }


            // Apply threshold: Opaque => 'auto'; Transparent => 'none'
            const newPointerEvents = alpha > threshold ? 'auto' : 'none';

            // Update style only if it changed to avoid unnecessary style recalcs
            if (el.style.pointerEvents !== newPointerEvents) {
                el.style.pointerEvents = newPointerEvents;
                if (this.log > 1) console.log(`AME: Set pointerEvents=${newPointerEvents} (alpha=${alpha.toFixed(3)}) on`, el);
            }

        } else {
            // Pointer is outside the element bounds, restore original style if needed
            if (el.style.pointerEvents !== originalPointerEvents) {
                el.style.pointerEvents = originalPointerEvents;
                 if (this.log > 1) console.log(`AME: Pointer left bounds, restored pointerEvents=${originalPointerEvents} on`, el);
            }
        }
    });
  }


  /**
   * Sets up a MutationObserver to automatically add/remove elements with the class.
   * @private
   */
  _observeMutations() {
    if (!('MutationObserver' in window) || this._mutationObserver) return;

    this._mutationObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Handle added nodes
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check the node itself
            if (node.matches && node.matches('.alpha-mask-events')) {
              this.add(node);
            }
            // Check descendants if the added node is a container
            if (node.querySelectorAll) {
              node.querySelectorAll('.alpha-mask-events').forEach(el => this.add(el));
            }
          }
        });

        // Handle removed nodes
        mutation.removedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check the node itself
            if (this.registry.has(node)) { // Check if it was registered
              this.remove(node);
            }
            // Check descendants (less common, but possible if a container was removed)
             if (node.querySelectorAll) {
                node.querySelectorAll('*').forEach(el => {
                    if (this.registry.has(el)) {
                        this.remove(el);
                    }
                });
            }
          }
        });

        // Handle attribute changes (e.g., class added/removed, src changed)
        if (mutation.type === 'attributes') {
            const targetElement = mutation.target;
            if (targetElement.nodeType === Node.ELEMENT_NODE) {
                const wasRegistered = this.registry.has(targetElement);
                const hasClass = targetElement.classList.contains('alpha-mask-events');
                const currentSrc = targetElement.tagName === 'IMG' ? (targetElement.currentSrc || targetElement.src) : getComputedStyle(targetElement).backgroundImage.match(/url\((['"]?)(.*?)\1\)/)?.[2];
                const registeredEntry = this.registry.get(targetElement);

                if (hasClass && !wasRegistered) {
                    // Class added, register it
                    this.add(targetElement);
                } else if (!hasClass && wasRegistered) {
                    // Class removed, unregister it
                    this.remove(targetElement);
                } else if (wasRegistered && currentSrc && registeredEntry && currentSrc !== registeredEntry.currentSrc) {
                    // Source changed (e.g., img src or background-image)
                    if (this.log) console.log('AME: Image source changed, re-processing element', targetElement);
                    // Re-process: remove old, add new (simplest way to handle src change)
                    this.remove(targetElement);
                    this.add(targetElement); // Re-add will pick up the new source
                }
            }
        }

      });
    });

    this._mutationObserver.observe(document.body, {
        childList: true,        // Observe direct children additions/removals
        subtree: true,          // Observe all descendants
        attributes: true,       // Observe attribute changes
        attributeFilter: ['class', 'src', 'style'] // Focus on relevant attributes (style for background-image)
    });
     if (this.log) console.log('AME: MutationObserver attached');
  }

  /**
   * Updates the canvas for an element, typically after a resize.
   * Re-calculates dimensions and redraws the background respecting CSS styles.
   *
   * @param {object} entry - The registry entry for the element.
   * @private
   */
  _updateCanvas(entry) {
      if (!entry || !entry.imageLoaded || !entry.el || !entry.canvas) {
          if (this.log) console.warn('AME: _updateCanvas called with invalid or incomplete entry', entry);
          return;
      }

      const { el, canvas } = entry;
      const rect = el.getBoundingClientRect();

      // Check if dimensions actually changed to avoid unnecessary redraws
      // Note: Using integer dimensions for canvas
      const newWidth = Math.round(rect.width);
      const newHeight = Math.round(rect.height);

      if (canvas.width === newWidth && canvas.height === newHeight) {
          // Dimensions haven't changed significantly, no redraw needed
          return;
      }

      if (newWidth <= 0 || newHeight <= 0) {
          if (this.log) console.log('AME: Element resized to zero or negative dimensions, skipping canvas update', el);
          // Optionally clear the canvas or handle as needed
          canvas.width = 1; // Set to minimal size
          canvas.height = 1;
          entry.ctx.clearRect(0, 0, 1, 1);
          return;
      }


      if (this.log) console.log('AME: Resizing canvas for element', el, `from ${canvas.width}x${canvas.height} to ${newWidth}x${newHeight}`);

      // Resize the canvas
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Redraw the background with new dimensions/styles
      this._drawBackgroundToCanvas(entry);
  }

  /**
   * Draws the element's image (src or background) onto its internal canvas,
   * attempting to respect background-size and background-position.
   *
   * @param {object} entry - The registry entry { el, canvas, ctx, img, ... }
   * @private
   */
  _drawBackgroundToCanvas(entry) {
      const { el, canvas, ctx, img } = entry;

      if (!img || !ctx || !canvas || canvas.width <= 0 || canvas.height <= 0) {
          if (this.log) console.warn('AME: Cannot draw background, missing image, context, or canvas dimensions are invalid', entry);
          return; // Cannot draw if image isn't loaded or canvas is invalid
      }

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;

      if (imgWidth <= 0 || imgHeight <= 0) {
           if (this.log) console.warn('AME: Image has zero dimensions, cannot draw.', img);
           return;
      }


      const computedStyle = getComputedStyle(el);
      const bgSize = computedStyle.backgroundSize;
      const bgPos = computedStyle.backgroundPosition;
      // const bgRepeat = computedStyle.backgroundRepeat; // TODO: Handle repeat? Complex.

      ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear previous content

      // --- Calculate destination rectangle (dx, dy, dw, dh) based on background-size ---
      let dw, dh;
      const imgRatio = imgWidth / imgHeight;
      const canvasRatio = canvasWidth / canvasHeight;

      if (bgSize === 'cover') {
          if (imgRatio > canvasRatio) { // Image wider than canvas ratio
              dh = canvasHeight;
              dw = dh * imgRatio;
          } else { // Image taller than canvas ratio
              dw = canvasWidth;
              dh = dw / imgRatio;
          }
      } else if (bgSize === 'contain') {
          if (imgRatio > canvasRatio) { // Image wider than canvas ratio
              dw = canvasWidth;
              dh = dw / imgRatio;
          } else { // Image taller than canvas ratio
              dh = canvasHeight;
              dw = dh * imgRatio;
          }
      } else if (bgSize === 'auto' || bgSize === 'auto auto') {
          dw = imgWidth;
          dh = imgHeight;
      } else {
          // Try parsing pixel/percentage values (simplistic)
          const parts = bgSize.split(' ');
          const sizeX = this._parseCssDimension(parts[0], canvasWidth, imgWidth);
          const sizeY = this._parseCssDimension(parts[1] || parts[0], canvasHeight, imgHeight); // Use first value if second is missing

          if (parts[0] === 'auto' && parts[1] && parts[1] !== 'auto') {
              dh = sizeY;
              dw = dh * imgRatio;
          } else if (parts[1] === 'auto' && parts[0] && parts[0] !== 'auto') {
              dw = sizeX;
              dh = dw / imgRatio;
          } else {
              dw = sizeX;
              dh = sizeY;
          }
      }

      // Ensure dimensions are positive
      dw = Math.max(1, Math.round(dw));
      dh = Math.max(1, Math.round(dh));


      // --- Calculate destination offset (dx, dy) based on background-position ---
      let dx, dy;
      const posParts = bgPos.split(' ');
      const posX = this._parseCssPosition(posParts[0], canvasWidth, dw);
      const posY = this._parseCssPosition(posParts[1] || posParts[0], canvasHeight, dh); // Use first if second missing

      dx = Math.round(posX);
      dy = Math.round(posY);


      // --- Draw the image ---
      // We draw the *entire* source image into the calculated destination rectangle
      try {
          // Use the 9-argument drawImage to draw the whole source image into the calculated dest rect
          ctx.drawImage(img, 0, 0, imgWidth, imgHeight, dx, dy, dw, dh);
          if (this.log > 1) console.log(`AME: Drew image to canvas for ${el.id || el.tagName}`, { dx, dy, dw, dh, canvasW: canvasWidth, canvasH: canvasHeight });
          entry._loggedImageDataError = false; // Reset error log flag on successful draw
      } catch (e) {
          // This might happen with certain image types or extreme scaling
          console.error('AME: Error during ctx.drawImage:', e, { el, img: img.src, dx, dy, dw, dh });
      }
  }

  /**
   * Helper to parse CSS dimension values (px, %, auto).
   * @param {string} value - CSS value string
   * @param {number} containerSize - Size of the container (width or height)
   * @param {number} imageSize - Natural size of the image (width or height)
   * @returns {number} - Calculated size in pixels
   * @private
   */
  _parseCssDimension(value, containerSize, imageSize) {
      if (!value || value === 'auto') {
          return imageSize;
      }
      if (value.endsWith('%')) {
          return (parseFloat(value) / 100) * containerSize;
      }
      if (value.endsWith('px')) {
          return parseFloat(value);
      }
      // Assume pixels if no unit (though spec requires unit)
      return parseFloat(value);
  }

   /**
   * Helper to parse CSS position values (px, %, keywords).
   * @param {string} value - CSS value string (e.g., 'left', 'center', 'right', '50%', '10px')
   * @param {number} containerSize - Size of the container (width or height)
   * @param {number} itemSize - Size of the item being positioned (dw or dh)
   * @returns {number} - Calculated position offset (dx or dy) in pixels
   * @private
   */
  _parseCssPosition(value, containerSize, itemSize) {
      if (!value) return 0; // Default to top/left

      switch (value) {
          case 'left':
          case 'top':
              return 0;
          case 'center':
              return (containerSize - itemSize) / 2;
          case 'right':
          case 'bottom':
              return containerSize - itemSize;
      }

      if (value.endsWith('%')) {
          // Percentage positioning relates the item's % point to the container's % point
          // Formula: (containerSize - itemSize) * (percentage / 100)
          return (containerSize - itemSize) * (parseFloat(value) / 100);
      }
      if (value.endsWith('px')) {
          return parseFloat(value);
      }
       // Assume pixels if no unit
      return parseFloat(value);
  }

}