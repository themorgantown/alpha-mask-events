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

export function init(options?: AMEOptions): AMEManager;
export function register(elOrSelector: HTMLElement|string, opts?: AMEOptions): void;
export function unregister(elOrSelector: HTMLElement|string): void;
export function setThreshold(value: number): void;
export default {
  init,
  register,
  unregister,
  setThreshold
};