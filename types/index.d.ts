export interface AMEOptions {
  /** transparency threshold (0–1) */
  threshold?: number;
  /** enable debug logging */
  log?: boolean;
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