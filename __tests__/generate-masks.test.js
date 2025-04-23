/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_PATH = path.resolve(__dirname, '../bin/generate-masks.js');
const FIXTURE_IMG = path.resolve(__dirname, 'fixtures/half.png');
const OUT_PATH = path.resolve(__dirname, 'tmp_mask.json');

describe('generate-masks CLI', () => {
  afterEach(() => {
    if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);
  });

  it('generates a mask JSON for a PNG', done => {
    execFile('node', [BIN_PATH, FIXTURE_IMG, '--out', OUT_PATH, '--threshold', '0.5'], (err, stdout, stderr) => {
      expect(err).toBeNull();
      expect(fs.existsSync(OUT_PATH)).toBe(true);
      const json = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
      expect(json[FIXTURE_IMG]).toBeDefined();
      expect(json[FIXTURE_IMG].width).toBeGreaterThan(0);
      expect(json[FIXTURE_IMG].height).toBeGreaterThan(0);
      expect(Array.isArray(json[FIXTURE_IMG].rects)).toBe(true);
      done();
    });
  });

  it('prints a success message', done => {
    execFile('node', [BIN_PATH, FIXTURE_IMG, '--out', OUT_PATH], (err, stdout, stderr) => {
      expect(stdout).toMatch(/Masks written to/);
      done();
    });
  });

  it('fails if no images are provided', done => {
    execFile('node', [BIN_PATH, '--out', OUT_PATH], (err, stdout, stderr) => {
      expect(err).not.toBeNull();
      done();
    });
  });
});
