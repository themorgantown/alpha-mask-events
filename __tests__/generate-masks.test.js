/**
 * @jest-environment node
 *
 * End-to-end tests for the `ame-generate-masks` CLI. These exercise the real
 * binary in a child process, which needs the native `canvas` package. Because
 * `canvas` is an OPTIONAL dependency, the whole suite is skipped (not failed)
 * on machines where it is not installed/buildable, so `npm test` stays green
 * across operating systems.
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { describe, it, expect, afterEach } from '@jest/globals';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_PATH = path.resolve(__dirname, '../bin/generate-masks.js');
const FIXTURE_IMG = path.resolve(__dirname, 'fixtures/half.png');
const OUT_PATH = path.resolve(__dirname, 'tmp_mask.json');

// Detect whether the REAL `canvas` native module can be loaded. `createRequire`
// bypasses Jest's `^canvas$` mock so this reflects what the child process sees.
let canvasAvailable = false;
try {
  createRequire(import.meta.url)('canvas');
  canvasAvailable = true;
} catch {
  canvasAvailable = false;
}

const describeWithCanvas = canvasAvailable ? describe : describe.skip;

if (!canvasAvailable) {
  // eslint-disable-next-line no-console
  console.warn('⏭️  Skipping generate-masks CLI tests: native "canvas" module not available.');
}

describeWithCanvas('🛠️  generate-masks CLI', () => {
  afterEach(() => {
    if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);
  });

  it('🎯 generates a mask JSON for a PNG', async () => {
    await execFileAsync('node', [BIN_PATH, FIXTURE_IMG, '--out', OUT_PATH, '--threshold', '0.5'], {
      timeout: 20000,
      encoding: 'utf8'
    });

    expect(fs.existsSync(OUT_PATH)).toBe(true);
    const json = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    expect(json[FIXTURE_IMG]).toBeDefined();
    expect(json[FIXTURE_IMG].width).toBeGreaterThan(0);
    expect(json[FIXTURE_IMG].height).toBeGreaterThan(0);
    expect(Array.isArray(json[FIXTURE_IMG].rects)).toBe(true);
  });

  it('📝 prints a success message', async () => {
    const { stdout } = await execFileAsync('node', [BIN_PATH, FIXTURE_IMG, '--out', OUT_PATH], {
      timeout: 20000,
      encoding: 'utf8'
    });
    expect(stdout).toMatch(/Masks written to/);
  });
});

// This case never touches `canvas` (it fails during argument parsing), so it
// can run everywhere.
describe('🛠️  generate-masks CLI argument validation', () => {
  it('❌ fails if no images are provided', async () => {
    await expect(
      execFileAsync('node', [BIN_PATH, '--out', OUT_PATH], { timeout: 10000, encoding: 'utf8' })
    ).rejects.toMatchObject({ code: expect.any(Number) });
  });
});
