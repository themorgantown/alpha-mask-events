import { Manager } from './manager.js';

let instance = null;

/**
 * Initializes the AlphaMaskEvents manager or returns the existing instance.
 * Scans the document for elements with the 'alpha-mask-events' class.
 * Attaches necessary global event listeners.
 * @param {object} [options] - Configuration options for the manager.
 * @param {number} [options.threshold=0.999] - Alpha threshold (0-1). Pixels with alpha <= threshold are ignored.
 * @param {boolean} [options.log=false] - Enable console logging for debugging.
 * @returns {Manager} The singleton instance of the Manager.
 */
function init(options = {}) {
    if (!instance) {
        instance = new Manager(options);
        instance.scan(); // Scan for elements on init
        instance.attachListeners(); // Attach global listeners
    }
    return instance;
}

/**
 * Manually registers a DOM element or selector string with the manager.
 * @param {HTMLElement|string} elementOrSelector - The DOM element or a CSS selector string.
 * @param {object} [options] - Element-specific options (e.g., threshold).
 */
function register(elementOrSelector, options = {}) {
    if (!instance) {
        init(); // Ensure instance exists
    }
    instance.add(elementOrSelector, options);
}

/**
 * Manually unregisters a DOM element or selector string from the manager.
 * @param {HTMLElement|string} elementOrSelector - The DOM element or a CSS selector string.
 */
function unregister(elementOrSelector) {
    if (instance) {
        instance.remove(elementOrSelector);
    }
}

/**
 * Sets the global alpha threshold for all registered elements that don't have an element-specific threshold.
 * @param {number} threshold - Alpha threshold (0-1).
 */
function setThreshold(threshold) {
    if (instance) {
        instance.setThreshold(threshold);
    }
}


export { init, register, unregister, setThreshold };
export default { init, register, unregister, setThreshold };