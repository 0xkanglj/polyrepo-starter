import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findSpecCenter, scanExistingModules, detectMode } from '../../src/steps/detect-mode.js';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import tmp from 'tmp-promise';

describe('findSpecCenter', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('finds spec-center in current directory', () => {
    const scDir = resolve(tempDir.path, 'acme-spec-center');
    mkdirSync(scDir, { recursive: true });
    expect(findSpecCenter(tempDir.path)).toBe(scDir);
  });

  it('finds spec-center in parent directory', () => {
    const scDir = resolve(tempDir.path, 'acme-spec-center');
    mkdirSync(scDir, { recursive: true });
    const childDir = resolve(tempDir.path, 'subdir');
    mkdirSync(childDir, { recursive: true });
    expect(findSpecCenter(childDir)).toBe(scDir);
  });

  it('returns null when no spec-center found', () => {
    expect(findSpecCenter(tempDir.path)).toBeNull();
  });

  it('stops searching after 5 levels', () => {
    let deepDir = tempDir.path;
    for (let i = 0; i < 6; i++) {
      deepDir = resolve(deepDir, `level${i}`);
      mkdirSync(deepDir, { recursive: true });
    }
    expect(findSpecCenter(deepDir)).toBeNull();
  });
});

describe('scanExistingModules', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('returns module names from prefixed directories', () => {
    mkdirSync(resolve(tempDir.path, 'acme-server'));
    mkdirSync(resolve(tempDir.path, 'acme-web'));
    mkdirSync(resolve(tempDir.path, 'other-project'));
    expect(scanExistingModules(tempDir.path, 'acme')).toEqual(['server', 'web']);
  });

  it('returns empty array when no modules exist', () => {
    expect(scanExistingModules(tempDir.path, 'acme')).toEqual([]);
  });

  it('ignores files with matching prefix', async () => {
    mkdirSync(resolve(tempDir.path, 'acme-server'));
    const { writeFileSync } = await import('fs');
    writeFileSync(resolve(tempDir.path, 'acme-notes.txt'), '');
    expect(scanExistingModules(tempDir.path, 'acme')).toEqual(['server']);
  });
});

describe('detectMode', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('returns init mode when --name is provided', () => {
    const result = detectMode(tempDir.path, { name: 'myproject' });
    expect(result.mode).toBe('init');
    expect(result.ctx).toEqual({});
  });

  it('returns add mode when spec-center is found', () => {
    const scDir = resolve(tempDir.path, 'acme-spec-center');
    mkdirSync(scDir, { recursive: true });
    mkdirSync(resolve(tempDir.path, 'acme-server'));

    const result = detectMode(tempDir.path, {});
    expect(result.mode).toBe('add');
    expect(result.ctx.projectName).toBe('acme');
    expect(result.ctx.workspaceDir).toBe(tempDir.path);
    expect(result.ctx.existingModules).toContain('spec-center');
    expect(result.ctx.existingModules).toContain('server');
    expect(result.ctx.specCenterDir).toBe(scDir);
  });

  it('returns init mode when nothing is found', () => {
    const result = detectMode(tempDir.path, {});
    expect(result.mode).toBe('init');
    expect(result.ctx).toEqual({});
  });
});
