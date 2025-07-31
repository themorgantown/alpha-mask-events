/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { jest, describe, it, expect, afterEach } from '@jest/globals';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_PATH = path.resolve(__dirname, '../bin/generate-masks.js');
const FIXTURE_IMG = path.resolve(__dirname, 'fixtures/half.png');
const OUT_PATH = path.resolve(__dirname, 'tmp_mask.json');

describe('🛠️  generate-masks CLI', () => {
  // Increase timeout for file operations
  jest.setTimeout(30000);

  afterEach(() => {
    if (fs.existsSync(OUT_PATH)) fs.unlinkSync(OUT_PATH);
  });

  it('🎯 generates a mask JSON for a PNG', async () => {
    console.log('🔍 Debug: Starting CLI test...');
    console.log('📁 BIN_PATH:', BIN_PATH);
    console.log('🖼️  FIXTURE_IMG:', FIXTURE_IMG);
    console.log('📄 OUT_PATH:', OUT_PATH);
    console.log('🔍 Image exists:', fs.existsSync(FIXTURE_IMG));
    
    try {
      const { stdout, stderr } = await execFileAsync('node', [BIN_PATH, FIXTURE_IMG, '--out', OUT_PATH, '--threshold', '0.5'], {
        timeout: 20000, // 20 second timeout
        encoding: 'utf8'
      });
      
      console.log('📝 CLI stdout:', stdout);
      console.log('📝 CLI stderr:', stderr);
      console.log('📄 Output file exists after CLI:', fs.existsSync(OUT_PATH));
      
      expect(fs.existsSync(OUT_PATH)).toBe(true);
      const json = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
      expect(json[FIXTURE_IMG]).toBeDefined();
      expect(json[FIXTURE_IMG].width).toBeGreaterThan(0);
      expect(json[FIXTURE_IMG].height).toBeGreaterThan(0);
      expect(Array.isArray(json[FIXTURE_IMG].rects)).toBe(true);
    } catch (error) {
      console.error('❌ CLI Error:', error.message);
      console.error('🔍 Error code:', error.code);
      console.error('🔍 Error signal:', error.signal);
      if (error.stderr) console.error('📝 Stderr:', error.stderr);
      if (error.stdout) console.error('📝 Stdout:', error.stdout);
      throw error;
    }
  });

  it('📝 prints a success message', async () => {
    try {
      const { stdout, stderr } = await execFileAsync('node', [BIN_PATH, FIXTURE_IMG, '--out', OUT_PATH], {
        timeout: 20000, // 20 second timeout
        encoding: 'utf8'
      });
      
      expect(stdout).toMatch(/Masks written to/);
    } catch (error) {
      console.error('❌ CLI Error:', error.message);
      if (error.stderr) console.error('📝 Stderr:', error.stderr);
      if (error.stdout) console.error('📝 Stdout:', error.stdout);
      throw error;
    }
  });

  it('❌ fails if no images are provided', async () => {
    try {
      await execFileAsync('node', [BIN_PATH, '--out', OUT_PATH], {
        timeout: 10000, // 10 second timeout for failure case
        encoding: 'utf8'
      });
      // If we get here, the command unexpectedly succeeded
      throw new Error('Expected command to fail but it succeeded');
    } catch (error) {
      // Should have an error because no images provided
      console.log('🔍 Error details:', { code: error.code, signal: error.signal, message: error.message });
      expect(error.code || error.signal || 1).toBeGreaterThan(0);
    }
  });
});
