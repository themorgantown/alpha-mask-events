export interface AMEOptions {
  /** transparency threshold (0–1) */
  threshold?: number;
  /** enable debug logging */
  log?: boolean;
  /** enable automatic performance optimization for off-screen elements */
  useIntersectionObserver?: boolean;
  /** root margin for IntersectionObserver */
  intersectionRootMargin?: string;
}

export interface AMEEventDetail {
  /** The HTML element that triggered the event */
  element: HTMLElement;
  /** The alpha value (0-1) at the cursor position */
  alpha: number;
  /** Canvas coordinates where the event occurred */
  coordinates: { x: number; y: number };
  /** The threshold value used for this element */
  threshold: number;
}

export interface AlphaMaskEvent extends CustomEvent<AMEEventDetail> {
  detail: AMEEventDetail;
}

export interface AMEManager {
  scan(): void;
  add(elOrSelector: HTMLElement|string, opts?: AMEOptions): void;
  remove(elOrSelector: HTMLElement|string): void;
  setThreshold(value: number): void;
  attachListeners(): void;
  detachListeners(): void;
}

/** 
 * Supported image formats for transparency detection 
 */
export type SupportedImageFormat = 
  | 'png'    // Full alpha channel support, universal browser support
  | 'webp'   // Full alpha channel support, modern browser support  
  | 'avif'   // Full alpha channel support, latest browser support
  | 'gif'    // Binary transparency only, universal browser support
  | 'svg'    // CSS/opacity transparency, modern browser support
  | 'jpeg'   // No transparency support, universal browser support
  | 'jpg'    // No transparency support, universal browser support
  | 'bmp'    // No transparency support, limited browser support
  | 'tiff'   // Limited transparency support, limited browser support
  | 'ico';   // Limited transparency support, limited browser support

/**
 * Format support information
 */
export interface ImageFormatInfo {
  /** Whether the format supports alpha transparency */
  hasAlpha: boolean | 'limited';
  /** Browser support level */
  browserSupport: 'universal' | 'modern' | 'latest' | 'limited';
}

/**
 * Initialize click-through manager on the page.
 * Now supports PNG, WebP, AVIF, GIF, SVG and other image formats.
 */
export function init(options?: AMEOptions): AMEManager;

/**
 * Register an element or selector for click-through.
 * Automatically detects image format and provides appropriate warnings.
 */
export function register(elOrSelector: HTMLElement|string, opts?: AMEOptions): void;

/** Unregister an element (stop hit‑testing it) */
export function unregister(elOrSelector: HTMLElement|string): void;

/** Adjust the global transparency threshold (0–1) */
export function setThreshold(value: number): void;

export default {
  init,
  register,
  unregister,
  setThreshold
};