/**
 * @jest-environment jsdom
 *
 * Tests for the public init() entry point, focused on the autoScan option.
 * Each test file gets an isolated module registry, so the index.js singleton
 * starts fresh here.
 */
import { describe, test, expect, beforeAll } from '@jest/globals';

beforeAll(() => {
  // Image that "loads" on next tick so manual register() can complete.
  window.Image = class MockImage {
    constructor() {
      this.onload = null;
      this.onerror = null;
      this.crossOrigin = null;
      this.naturalWidth = 10;
      this.naturalHeight = 10;
      Object.defineProperty(this, 'src', {
        set(value) {
          this._src = value;
          setTimeout(() => this.onload && this.onload(), 0);
        },
        get() {
          return this._src;
        }
      });
    }
  };
});

describe('🚀  init() autoScan option', () => {
  test('autoScan:false does not auto-register existing .alpha-mask-events elements', async () => {
    document.body.innerHTML = '<img src="a.png" class="alpha-mask-events" id="a" />';
    const { init } = await import('../src/index.js');

    const mgr = init({ autoScan: false });
    await new Promise((r) => setTimeout(r, 10));

    expect(mgr.registry.size).toBe(0);
  });

  test('manual register() still works after init({ autoScan: false })', async () => {
    const { register } = await import('../src/index.js');
    const img = document.getElementById('a');

    register(img);
    // Wait for the mock image to "load" and populate the registry entry.
    await new Promise((r) => setTimeout(r, 10));

    const { init } = await import('../src/index.js');
    expect(init().registry.has(img)).toBe(true);
  });
});
