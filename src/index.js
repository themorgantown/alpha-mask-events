import Manager from './manager.js';

let mgr = null;

/**
 * Initialize the Alpha Mask Events module with global options.
 * 
 * This function sets up event listeners and automatically scans for elements 
 * with the 'alpha-mask-events' class. It enables click-through behavior on 
 * transparent parts of PNG images and elements with PNG background-images.
 * 
 * @param {Object} options - Configuration options
 * @param {number} [options.threshold=0.999] - Transparency threshold (0-1). Pixels with alpha values less 
 *                                         than or equal to this value will be click-through.
 *                                         Default is 0.999 (nearly transparent pixels pass clicks through)
 * @param {boolean} [options.log=false] - Enable debug logging
 * @returns {Object} The manager instance
 * 
 * @example
 * // Basic initialization
 * AlphaMaskEvents.init();
 * 
 * @example
 * // Custom threshold (make more pixels click-through)
 * AlphaMaskEvents.init({ threshold: 0.5 });
 */
export function init(options = {}) {
  if (!mgr) {
    mgr = new Manager(options);
    mgr.scan();
    mgr.attachListeners();
  }
  return mgr;
}

/**
 * Manually register an element or selector for alpha mask hit-testing.
 * 
 * This function allows you to add elements to be processed for transparent
 * click-through behavior without using the 'alpha-mask-events' class.
 * Useful for dynamically created elements or when you want to control exactly
 * which elements have the behavior.
 * 
 * @param {HTMLElement|string} target - DOM element or CSS selector to register
 * @param {Object} opts - Configuration options specific to this element
 * @param {number} [opts.threshold] - Per-element transparency threshold.
 *                                   Overrides the global threshold for this element.
 * @param {boolean} [opts.log] - Enable debug logging for this element
 * 
 * @example
 * // Register by CSS selector
 * AlphaMaskEvents.register('#top-layer-image');
 * 
 * @example
 * // Register DOM element with custom threshold
 * const element = document.querySelector('.special-image');
 * AlphaMaskEvents.register(element, { threshold: 0.8 });
 */
export function register(target, opts = {}) {
  if (!mgr) init();
  mgr.add(target, opts);
}

/** Unregister an element (stop hit‑testing it) */
export function unregister(target) {
  mgr && mgr.remove(target);
}

/** Adjust the global transparency threshold (0–1) */
export function setThreshold(value) {
  mgr && mgr.setThreshold(value);
}

export default {
  init,
  register,
  unregister,
  setThreshold
};