/**
 * @jest-environment node
 *
 * Unit tests for the CLI's pure image-processing logic. These run everywhere
 * because they use a stub canvas instead of the native `canvas` package.
 */
import { describe, test, expect } from '@jest/globals';
import { blurAlpha, maskToRects, hasTransparency, processImages } from '../bin/generate-masks.js';

describe('🧮  maskToRects', () => {
  test('collapses contiguous opaque pixels into per-row rectangles', () => {
    const width = 4, height = 2;
    // Row 0: opaque, opaque, gap, opaque  | Row 1: all transparent
    const mask = [1, 1, 0, 1, 0, 0, 0, 0];
    expect(maskToRects(mask, width, height)).toEqual([
      { x: 0, y: 0, w: 2, h: 1 },
      { x: 3, y: 0, w: 1, h: 1 }
    ]);
  });

  test('returns no rectangles for a fully transparent image', () => {
    expect(maskToRects([0, 0, 0, 0], 2, 2)).toEqual([]);
  });
});

describe('🌫️  blurAlpha', () => {
  test('returns one averaged alpha value per pixel', () => {
    // 2x1 image, alpha 0 and 255; radius 1 averages neighbours.
    const data = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 255]);
    const out = blurAlpha(data, 2, 1, 1);
    expect(out).toHaveLength(2);
    // Each pixel sees both samples → average of 0 and 255.
    expect(out[0]).toBeCloseTo(127.5);
    expect(out[1]).toBeCloseTo(127.5);
  });
});

describe('🔍  hasTransparency', () => {
  test('detects a non-opaque pixel', () => {
    expect(hasTransparency({ data: [255, 0, 0, 200] })).toBe(true);
  });
  test('reports false when every pixel is fully opaque', () => {
    expect(hasTransparency({ data: [255, 0, 0, 255, 0, 255, 0, 255] })).toBe(false);
  });
});

describe('🛠️  processImages (stub canvas)', () => {
  // A minimal stand-in for the native `canvas` API.
  function makeStubCanvas(width, height, alphaAt) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data[(y * width + x) * 4 + 3] = alphaAt(x, y);
      }
    }
    return {
      loadImage: () => Promise.resolve({ width, height }),
      createCanvas: () => ({
        getContext: () => ({
          drawImage: () => {},
          getImageData: () => ({ data })
        })
      })
    };
  }

  test('produces a mask entry with rectangles for opaque regions', async () => {
    // Left half opaque, right half transparent.
    const canvas = makeStubCanvas(4, 1, (x) => (x < 2 ? 255 : 0));
    const { output, errors } = await processImages(
      ['shape.png'],
      { threshold: 0.5, blur: 0 },
      canvas
    );

    expect(errors).toHaveLength(0);
    expect(output['shape.png']).toEqual({
      width: 4,
      height: 1,
      rects: [{ x: 0, y: 0, w: 2, h: 1 }]
    });
  });

  test('skips files with unsupported extensions', async () => {
    const canvas = makeStubCanvas(2, 2, () => 255);
    const { output } = await processImages(['notes.txt'], { threshold: 0.5, blur: 0 }, canvas);
    expect(output['notes.txt']).toBeUndefined();
  });
});
