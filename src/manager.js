/**
 * Default transparency threshold - pixels with alpha less than or equal to this value
 * will be click-through. Set very close to 1 to make nearly transparent pixels click-through.
 */
const DEFAULT_THRESHOLD = 0.999; // Pixels with alpha > this are considered opaque

/**
 * Supported image formats with transparency capability
 */
const SUPPORTED_FORMATS = {
  // Formats with full alpha channel support
  'png': { hasAlpha: true, browserSupport: 'universal' },
  'webp': { hasAlpha: true, browserSupport: 'modern' }, // Chrome 23+, Firefox 65+, Safari 14+
  'avif': { hasAlpha: true, browserSupport: 'latest' },  // Chrome 85+, Firefox 93+, Safari 16.4+
  
  // Formats with limited transparency
  'gif': { hasAlpha: 'limited', browserSupport: 'universal' }, // Binary transparency only
  
  // Formats without transparency (processed but with warnings)
  'jpg': { hasAlpha: false, browserSupport: 'universal' },
  'jpeg': { hasAlpha: false, browserSupport: 'universal' },
  'bmp': { hasAlpha: false, browserSupport: 'limited' },
  'tiff': { hasAlpha: 'limited', browserSupport: 'limited' },
  'ico': { hasAlpha: 'limited', browserSupport: 'limited' },
  'svg': { hasAlpha: true, browserSupport: 'modern' } // SVG can have transparency via CSS/opacity
};

/**
 * Detect and validate image format from URL
 * @param {string} src - Image source URL
 * @returns {Object} Format information
 */
function detectImageFormat(src) {
  // Extract extension from URL (handle query params, fragments)
  const urlPath = src.split('?')[0].split('#')[0];
  const extension = urlPath.split('.').pop()?.toLowerCase();
  
  if (!extension) {
    return { format: 'unknown', info: null, warning: 'Unable to detect image format from URL' };
  }
  
  const formatInfo = SUPPORTED_FORMATS[extension];
  if (!formatInfo) {
    return { 
      format: extension, 
      info: null, 
      warning: `Unsupported or unknown format: ${extension}. Transparency detection may not work.` 
    };
  }
  
  const warnings = [];
  
  // Add browser support warnings
  if (formatInfo.browserSupport === 'modern') {
    warnings.push(`${extension.toUpperCase()} requires modern browser support`);
  } else if (formatInfo.browserSupport === 'latest') {
    warnings.push(`${extension.toUpperCase()} requires very recent browser support`);
  }
  
  // Add transparency capability warnings
  if (formatInfo.hasAlpha === false) {
    warnings.push(`${extension.toUpperCase()} format does not support transparency`);
  } else if (formatInfo.hasAlpha === 'limited') {
    warnings.push(`${extension.toUpperCase()} has limited transparency support`);
  }
  
  return {
    format: extension,
    info: formatInfo,
    warning: warnings.length > 0 ? warnings.join('; ') : null
  };
}

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
   * @param {boolean} [options.useIntersectionObserver=true] - Enable automatic performance optimization for off-screen elements
   * @param {string} [options.intersectionRootMargin='100px'] - Root margin for IntersectionObserver
   */
  constructor({ threshold = DEFAULT_THRESHOLD, log = false, useIntersectionObserver = true, intersectionRootMargin = '100px' } = {}) {
    this.threshold = threshold;
    this.log       = log;
    this.useIntersectionObserver = useIntersectionObserver;
    this.intersectionRootMargin = intersectionRootMargin;
    // Registry stores: { el, canvas, ctx, threshold, originalPointerEvents, img, imageLoaded, currentSrc }
    this.registry  = new Map(); // Use Map for easier element lookup/removal
    this._handler  = this._onPointerEvent.bind(this);
    this._rafPending = false;       // Flag to prevent redundant animation frames
    this._lastEvent = null;         // Store most recent event for delayed processing
    this._mutationObserver = null;  // For observing DOM changes
    this._resizeObservers = new WeakMap(); // Track resize observers per element
    this._intersectionObserver = null; // For performance optimization
    this._intersectionElements = new Set(); // Track elements under intersection observation
    this._compatibilityWarningShown = false; // Track if browser compatibility warning has been shown
    this._listenersAttached = false; // Track if global listeners are attached
  }

  /**
   * Scan the document for elements with the 'alpha-mask-events' class and register them.
   * Also sets up observation for future DOM changes to auto-register new elements.
   */
  scan() {
    // Show browser compatibility warnings if needed
    if (this.log) {
      this._showBrowserCompatibilityWarning();
    }
    
    document.querySelectorAll('.alpha-mask-events')
      .forEach(el => this.add(el));
    this._observeMutations();
    this._setupIntersectionObserver();
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

    // Detect and validate image format
    const formatDetection = detectImageFormat(src);
    if (this.log && formatDetection.warning) {
        console.warn(`AME: Format warning for ${src}: ${formatDetection.warning}`);
    }
    
    // Enhanced logging for format detection
    if (this.log) {
        console.log(`AME: Detected format: ${formatDetection.format?.toUpperCase() || 'unknown'} for ${src}`);
        if (formatDetection.info) {
            const alphaSupportText = formatDetection.info.hasAlpha === true ? '✅ Full alpha' :
                                   formatDetection.info.hasAlpha === 'limited' ? '⚠️ Limited alpha' :
                                   '❌ No alpha';
            console.log(`AME: Format capabilities - ${alphaSupportText}, Browser: ${formatDetection.info.browserSupport}`);
        }
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
        currentSrc: src,
        isVisible: true, // Assume visible initially (will be updated by IntersectionObserver if enabled)
        _lastOpaqueState: null, // Track opaque/transparent state for custom events
        _transformCache: null, // Cache for transform matrix calculations (performance optimization)
        _lastTransform: computedStyle.transform // Track transform changes for cache invalidation
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
            if (this.log) {
                console.warn('AME: ResizeObserver not supported. Layout changes might affect accuracy.');
            }
        }

        // Add to IntersectionObserver for performance optimization
        if (this.useIntersectionObserver) {
            if (!this._intersectionObserver) {
                this._setupIntersectionObserver();
            }
            if (this._intersectionObserver && !this._intersectionElements.has(el)) {
                this._intersectionObserver.observe(el);
                this._intersectionElements.add(el);
                entry.isVisible = true; // Assume visible until IntersectionObserver says otherwise
            }
        }
    };
    img.onerror = (e) => {
        const errorDetails = {
            element: el,
            src,
            error: e.type || 'unknown',
            format: formatDetection.format,
            timestamp: new Date().toISOString()
        };
        
        console.error('AME: Image loading failed - implementing recovery strategies', errorDetails);
        console.group('AME: Image Loading Recovery Guide');
        console.info('🔧 Troubleshooting Steps:');
        console.info('1. Check if the image URL is accessible:', src);
        console.info('2. Verify CORS headers if cross-origin:', 
            src.startsWith('http') && !src.startsWith(window.location.origin) ? 
            '⚠️  Cross-origin detected' : '✓ Same-origin');
        console.info('3. Image format compatibility:');
        if (formatDetection.format && formatDetection.info) {
            console.info(`   • Format: ${formatDetection.format.toUpperCase()}`);
            console.info(`   • Browser support: ${formatDetection.info.browserSupport}`);
            console.info(`   • Alpha support: ${formatDetection.info.hasAlpha === true ? 'Full' : 
                          formatDetection.info.hasAlpha === 'limited' ? 'Limited' : 'None'}`);
            
            // Format-specific advice
            if (formatDetection.format === 'webp') {
                console.info('   💡 WebP: Ensure browser supports WebP (Chrome 23+, Firefox 65+, Safari 14+)');
            } else if (formatDetection.format === 'avif') {
                console.info('   💡 AVIF: Requires very recent browser (Chrome 85+, Firefox 93+, Safari 16.4+)');
            } else if (!formatDetection.info.hasAlpha) {
                console.info('   ⚠️  This format doesn\'t support transparency');
            }
        } else {
            console.info('   ⚠️  Unknown or unsupported format detected');
            console.info('   📋 Fully supported: PNG, WebP, AVIF, GIF');
            console.info('   📋 Partially supported: SVG, JPEG (no transparency), BMP, TIFF');
        }
        console.info('4. Check network connectivity and server availability');
        console.info('💡 Alternative Solutions:');
        console.info('• Use the CLI tool to pre-generate masks: npx ame-generate-masks');
        console.info('• Implement server-side image processing');
        console.info('• Use PNG format for maximum compatibility');
        console.info('• Use same-origin images when possible');
        console.groupEnd();
        
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

    // Remove from IntersectionObserver if enabled
    if (this._intersectionObserver && this._intersectionElements.has(el)) {
        this._intersectionObserver.unobserve(el);
        this._intersectionElements.delete(el);
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
      document.addEventListener('pointerdown', this._handler, { passive: true }); // Handle before clicks/taps
      document.addEventListener('pointerover', this._handler, { passive: true }); // Handle hover/enter
    } else {
      document.addEventListener('mousemove', this._handler, { passive: true });
      document.addEventListener('touchmove', this._handler, { passive: true });
      document.addEventListener('mousedown', this._handler, { passive: true }); // Handle before clicks
      document.addEventListener('touchstart', this._handler, { passive: true }); // Handle before taps
      document.addEventListener('mouseover', this._handler, { passive: true }); // Handle hover
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
      document.removeEventListener('pointerdown', this._handler);
      document.removeEventListener('pointerover', this._handler);
    } else {
      document.removeEventListener('mousemove', this._handler);
      document.removeEventListener('touchmove', this._handler);
      document.removeEventListener('mousedown', this._handler);
      document.removeEventListener('touchstart', this._handler);
      document.removeEventListener('mouseover', this._handler);
    }

    // Clean up MutationObserver
    if (this._mutationObserver) {
      this._mutationObserver.disconnect();
      this._mutationObserver = null;
    }

    // Clean up IntersectionObserver
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
      this._intersectionObserver = null;
      this._intersectionElements.clear();
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
        const { el, canvas, ctx, threshold, originalPointerEvents, imageLoaded, isVisible } = entry;

        // Performance optimization: Skip processing for off-screen elements
        if (this.useIntersectionObserver && isVisible === false) {
            return; // Element is not visible, skip expensive hit-testing
        }

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

            // Map screen coordinates to canvas coordinates with CSS transform support
            // This handles rotation, scaling, skewing, and other CSS transforms
            const { canvasX, canvasY } = this._mapPointerToCanvasCoordinates(
                clientX, clientY, el, rect, canvas, entry
            );

            let alpha = 0; // Default to transparent if sampling fails
            // Ensure coordinates are within canvas bounds before sampling
            if (canvasX >= 0 && canvasX < canvas.width && canvasY >= 0 && canvasY < canvas.height) {
                try {
                    // Sample the alpha value from the corresponding pixel on the internal canvas
                    const pixelData = ctx.getImageData(canvasX, canvasY, 1, 1).data;
                    alpha = pixelData[3] / 255; // Alpha is the 4th component (0-255)
                } catch (err) {
                    // Enhanced CORS error recovery with fallback strategies
                    if (this.log && !entry._loggedImageDataError) {
                        console.warn('AME: getImageData failed - implementing fallback strategy.', {
                            element: el,
                            error: err.message,
                            src: entry.currentSrc,
                            fallback: 'Using bounding box approximation'
                        });
                        console.info('AME: CORS Recovery Tips:\n' +
                            '• Ensure images have crossOrigin="anonymous" attribute\n' +
                            '• Verify server sends Access-Control-Allow-Origin headers\n' +
                            '• Consider using the CLI tool for pre-generated masks\n' +
                            '• Use same-origin images when possible');
                        entry._loggedImageDataError = true;
                    }
                    
                    // Fallback Strategy 1: Bounding box approximation
                    // Use element's bounding rectangle to approximate click behavior
                    alpha = this._approximateAlphaFromBounds(el, clientX, clientY, rect);
                }
            } else {
                 if (this.log) console.log('AME: Calculated coords outside canvas bounds', { canvasX, canvasY, canvasW: canvas.width, canvasH: canvas.height });
                 // Treat as transparent if outside calculated canvas bounds
                 alpha = 0;
            }


            // Apply threshold: Opaque => 'auto'; Transparent => 'none'
            const newPointerEvents = alpha > threshold ? 'auto' : 'none';
            const isOpaque = alpha > threshold;

            // Dispatch custom events when transitioning between opaque/transparent states
            if (entry._lastOpaqueState !== isOpaque) {
                if (isOpaque) {
                    // Transitioning from transparent to opaque
                    this._dispatchAlphaMaskEvent(el, 'alpha-mask-over', {
                        alpha,
                        coordinates: { x: canvasX, y: canvasY },
                        threshold,
                        element: el
                    });
                } else {
                    // Transitioning from opaque to transparent
                    this._dispatchAlphaMaskEvent(el, 'alpha-mask-out', {
                        alpha,
                        coordinates: { x: canvasX, y: canvasY },
                        threshold,
                        element: el
                    });
                }
                entry._lastOpaqueState = isOpaque;
            }

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
            
            // Dispatch alpha-mask-out event if we were previously in an opaque state
            if (entry._lastOpaqueState === true) {
                this._dispatchAlphaMaskEvent(el, 'alpha-mask-out', {
                    alpha: 0, // Outside bounds, treat as transparent
                    coordinates: { x: -1, y: -1 }, // Invalid coordinates to indicate outside bounds
                    threshold,
                    element: el
                });
                entry._lastOpaqueState = null; // Reset state when outside bounds
            }
        }
    });
  }

  /**
   * Dispatch a custom alpha mask event on the specified element.
   *
   * @param {HTMLElement} element - The element to dispatch the event on
   * @param {string} eventType - The event type ('alpha-mask-over' or 'alpha-mask-out')
   * @param {Object} detail - Event detail object
   * @private
   */
  _dispatchAlphaMaskEvent(element, eventType, detail) {
    try {
      const event = new CustomEvent(eventType, {
        detail,
        bubbles: false,    // Don't bubble by default
        cancelable: false  // Not cancelable
      });
      element.dispatchEvent(event);
      
      if (this.log > 1) {
        console.log(`AME: Dispatched ${eventType} on`, element, 'with detail:', detail);
      }
    } catch (error) {
      if (this.log) {
        console.warn(`AME: Failed to dispatch ${eventType} event:`, error);
      }
    }
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
                } else if (wasRegistered && registeredEntry && mutation.attributeName === 'style') {
                    // Style changed - invalidate transform cache for transform-related changes
                    const currentTransform = getComputedStyle(targetElement).transform;
                    if (registeredEntry._transformCache && registeredEntry._lastTransform !== currentTransform) {
                        if (this.log > 1) console.log('AME: Transform changed, invalidating cache', targetElement);
                        registeredEntry._transformCache = null; // Clear transform cache
                        registeredEntry._lastTransform = currentTransform;
                    }
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
   * Sets up IntersectionObserver for performance optimization.
   * Automatically disables hit-testing for off-screen elements.
   * @private
   */
  _setupIntersectionObserver() {
    if (!this.useIntersectionObserver || !('IntersectionObserver' in window) || this._intersectionObserver) {
      return;
    }

    this._intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        const registryEntry = this.registry.get(el);
        
        if (!registryEntry) return; // Element may have been unregistered
        
        const isVisible = entry.isIntersecting;
        registryEntry.isVisible = isVisible;
        
        if (this.log > 1) {
          console.log(`AME: Element ${isVisible ? 'entered' : 'left'} viewport`, el);
        }
        
        // Optionally disable pointer event processing for invisible elements
        // This can significantly improve performance on pages with many images
        if (!isVisible) {
          // Temporarily restore original pointer events when off-screen
          el.style.pointerEvents = registryEntry.originalPointerEvents;
        }
      });
    }, {
      rootMargin: this.intersectionRootMargin,
      threshold: [0, 0.1] // Trigger when element starts entering/leaving viewport
    });

    if (this.log) console.log('AME: IntersectionObserver setup complete');
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

  /**
   * Fallback alpha approximation when canvas is tainted (CORS issues).
   * Uses element geometry and typical image layout patterns for best guess.
   *
   * @param {HTMLElement} el - The element 
   * @param {number} clientX - Mouse X coordinate
   * @param {number} clientY - Mouse Y coordinate  
   * @param {DOMRect} rect - Element bounding rectangle
   * @returns {number} - Approximated alpha value (0-1)
   * @private
   */
  _approximateAlphaFromBounds(el, clientX, clientY, rect) {
      // Strategy: Use conservative heuristics for common image patterns
      
      // Calculate relative position within element (0-1)
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;
      
      // Fallback 1: Center-weighted approximation (most images have content in center)
      const centerX = 0.5, centerY = 0.5;
      const distanceFromCenter = Math.sqrt(
          Math.pow(relX - centerX, 2) + Math.pow(relY - centerY, 2)
      );
      
      // Assume center 70% is likely opaque, edges likely transparent
      const centerOpacityRadius = 0.35; // 70% diameter
      
      if (distanceFromCenter <= centerOpacityRadius) {
          return 1.0; // Likely opaque
      } else {
          // Edge regions - use threshold-aware fallback
          const edgeDistance = (distanceFromCenter - centerOpacityRadius) / (0.707 - centerOpacityRadius); // 0.707 = corner distance
          return Math.max(0, 1 - edgeDistance * 1.5); // Gradual falloff
      }
  }

  /**
   * Maps pointer coordinates to canvas coordinates, accounting for CSS transforms.
   * Handles rotation, scaling, skewing, translation, and complex transform matrices.
   * 
   * @param {number} clientX - Pointer X coordinate in viewport space
   * @param {number} clientY - Pointer Y coordinate in viewport space
   * @param {HTMLElement} el - The element being tested
   * @param {DOMRect} rect - Element bounding rectangle
   * @param {HTMLCanvasElement} canvas - Internal canvas for the element
   * @param {Object} entry - Registry entry for caching/optimization
   * @returns {Object} - { canvasX, canvasY } coordinates in canvas space
   * @private
   */
  _mapPointerToCanvasCoordinates(clientX, clientY, el, rect, canvas, entry) {
    // Calculate relative coordinates within element bounds (basic case)
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Get current computed transform
    const computedStyle = getComputedStyle(el);
    const transform = computedStyle.transform;
    
    // Check if we need to handle transforms
    if (!transform || transform === 'none') {
      // No transforms - use simple coordinate mapping
      return {
        canvasX: Math.floor(relativeX * (canvas.width / rect.width)),
        canvasY: Math.floor(relativeY * (canvas.height / rect.height))
      };
    }
    
    // Cache transform matrix calculations for performance
    const transformCacheKey = `${transform}_${rect.width}_${rect.height}`;
    if (entry._transformCache?.key === transformCacheKey) {
      // Use cached inverse transform
      const { inverseMatrix } = entry._transformCache;
      const transformedCoords = this._applyInverseTransform(
        relativeX - rect.width / 2,  // Center-relative coordinates
        relativeY - rect.height / 2,
        inverseMatrix
      );
      
      return {
        canvasX: Math.floor((transformedCoords.x + rect.width / 2) * (canvas.width / rect.width)),
        canvasY: Math.floor((transformedCoords.y + rect.height / 2) * (canvas.height / rect.height))
      };
    }
    
    // Parse and invert the transform matrix
    try {
      const matrix = this._parseTransformMatrix(transform);
      const inverseMatrix = this._invertMatrix(matrix);
      
      // Cache the result for performance
      entry._transformCache = {
        key: transformCacheKey,
        matrix,
        inverseMatrix
      };
      
      // Apply inverse transform to get coordinates in element's local space
      const transformedCoords = this._applyInverseTransform(
        relativeX - rect.width / 2,  // Center-relative coordinates
        relativeY - rect.height / 2,
        inverseMatrix
      );
      
      // Convert back to canvas coordinates
      return {
        canvasX: Math.floor((transformedCoords.x + rect.width / 2) * (canvas.width / rect.width)),
        canvasY: Math.floor((transformedCoords.y + rect.height / 2) * (canvas.height / rect.height))
      };
      
    } catch (error) {
      // Transform parsing failed - fall back to simple mapping
      if (this.log) {
        console.warn('AME: Transform parsing failed, using simple coordinate mapping', {
          element: el,
          transform,
          error: error.message
        });
      }
      
      return {
        canvasX: Math.floor(relativeX * (canvas.width / rect.width)),
        canvasY: Math.floor(relativeY * (canvas.height / rect.height))
      };
    }
  }

  /**
   * Parses a CSS transform matrix string into a numeric matrix array.
   * Supports both matrix() and matrix3d() formats.
   * 
   * @param {string} transformString - CSS transform value (e.g., "matrix(1, 0, 0, 1, 0, 0)")
   * @returns {Array<number>} - 6-element array for 2D matrix [a, b, c, d, e, f]
   * @private
   */
  _parseTransformMatrix(transformString) {
    // Handle matrix3d - extract 2D components
    if (transformString.includes('matrix3d')) {
      const match = transformString.match(/matrix3d\(([-\d.\s,]+)\)/);
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        // Extract 2D transformation from 3D matrix (take relevant 2D components)
        return [values[0], values[1], values[4], values[5], values[12], values[13]];
      }
    }
    
    // Handle matrix
    if (transformString.includes('matrix')) {
      const match = transformString.match(/matrix\(([-\d.\s,]+)\)/);
      if (match) {
        const values = match[1].split(',').map(v => parseFloat(v.trim()));
        return values; // [a, b, c, d, e, f]
      }
    }
    
    // Handle individual transform functions (rotate, scale, etc.)
    // This is more complex but covers common cases
    if (transformString.includes('rotate') || transformString.includes('scale') || 
        transformString.includes('skew') || transformString.includes('translate')) {
      
      // Create a temporary element to let the browser compute the matrix
      const tempEl = document.createElement('div');
      tempEl.style.transform = transformString;
      tempEl.style.position = 'absolute';
      tempEl.style.visibility = 'hidden';
      document.body.appendChild(tempEl);
      
      try {
        const computedTransform = getComputedStyle(tempEl).transform;
        document.body.removeChild(tempEl);
        
        if (computedTransform && computedTransform !== 'none') {
          return this._parseTransformMatrix(computedTransform);
        }
      } catch (error) {
        document.body.removeChild(tempEl);
        throw error;
      }
    }
    
    // Fallback - identity matrix
    return [1, 0, 0, 1, 0, 0];
  }

  /**
   * Calculates the inverse of a 2D transformation matrix.
   * Uses the mathematical formula for 2D matrix inversion.
   * 
   * @param {Array<number>} matrix - 6-element matrix [a, b, c, d, e, f]
   * @returns {Array<number>} - Inverted 6-element matrix
   * @private
   */
  _invertMatrix(matrix) {
    const [a, b, c, d, e, f] = matrix;
    
    // Calculate determinant
    const det = a * d - b * c;
    
    // Check for singular matrix (non-invertible)
    if (Math.abs(det) < 1e-10) {
      if (this.log) {
        console.warn('AME: Transform matrix is singular (non-invertible), using identity');
      }
      return [1, 0, 0, 1, 0, 0];
    }
    
    // Calculate inverse matrix elements
    const invDet = 1 / det;
    
    return [
      d * invDet,           // a'
      -b * invDet,          // b'  
      -c * invDet,          // c'
      a * invDet,           // d'
      (c * f - d * e) * invDet,  // e'
      (b * e - a * f) * invDet   // f'
    ];
  }

  /**
   * Applies an inverse transform matrix to a point.
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate  
   * @param {Array<number>} inverseMatrix - 6-element inverse transform matrix
   * @returns {Object} - Transformed coordinates { x, y }
   * @private
   */
  _applyInverseTransform(x, y, inverseMatrix) {
    const [a, b, c, d, e, f] = inverseMatrix;
    
    return {
      x: a * x + c * y + e,
      y: b * x + d * y + f
    };
  }

  /**
   * Display browser compatibility warnings for missing features.
   * @private
   */
  _showBrowserCompatibilityWarning() {
    if (this._compatibilityWarningShown) return; // Show only once
    this._compatibilityWarningShown = true;

    const missingFeatures = [];
    const recommendedPolyfills = [];

    // Check for missing APIs
    if (!('ResizeObserver' in window)) {
        missingFeatures.push('ResizeObserver');
        recommendedPolyfills.push('https://github.com/que-etc/resize-observer-polyfill');
    }

    if (!('IntersectionObserver' in window)) {
        missingFeatures.push('IntersectionObserver');
        recommendedPolyfills.push('https://github.com/w3c/IntersectionObserver/tree/main/polyfill');
    }

    if (!('PointerEvent' in window)) {
        missingFeatures.push('PointerEvent');
        console.info('AME: Falling back to mouse/touch events (PointerEvent not supported)');
    }

    if (missingFeatures.length > 0) {
        console.group('AME: Browser Compatibility Notice');
        console.warn(`Missing features: ${missingFeatures.join(', ')}`);
        console.info('🌐 Browser Support:');
        console.info('• Chrome 50+ ✓');
        console.info('• Firefox 50+ ✓');  
        console.info('• Safari 11+ ✓');
        console.info('• Edge 18+ ✓');
        console.info('📦 Recommended Polyfills:');
        recommendedPolyfills.forEach(polyfill => console.info(`• ${polyfill}`));
        console.info('💡 For optimal performance, consider upgrading your browser');
        console.groupEnd();
    }
  }

}