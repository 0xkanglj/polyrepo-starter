import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isDirNonEmpty, resolveDir } from '../../src/steps/resolve-dir.js';
import { mkdirSync, writeFileSync, symlinkSync } from 'fs';
import { resolve } from 'path';
import tmp from 'tmp-promise';
import { CommandError } from '../../src/utils/errors.js';

describe('isDirNonEmpty', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('returns false when directory does not exist', () => {
    expect(isDirNonEmpty(resolve(tempDir.path, 'no-such-dir'))).toBe(false);
  });

  it('returns false when directory is empty', () => {
    const emptyDir = resolve(tempDir.path, 'empty');
    mkdirSync(emptyDir);
    expect(isDirNonEmpty(emptyDir)).toBe(false);
  });

  it('returns true when directory has files', () => {
    writeFileSync(resolve(tempDir.path, 'file.txt'), 'hello');
    expect(isDirNonEmpty(tempDir.path)).toBe(true);
  });

  it('returns true when directory has subdirectories', () => {
    mkdirSync(resolve(tempDir.path, 'subdir'));
    expect(isDirNonEmpty(tempDir.path)).toBe(true);
  });

  it('returns true when path is a file, not a directory', () => {
    const filePath = resolve(tempDir.path, 'a-file');
    writeFileSync(filePath, 'not a dir');
    expect(isDirNonEmpty(filePath)).toBe(true);
  });
});

describe('resolveDir', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('returns expanded directory when it does not exist', async () => {
    const target = resolve(tempDir.path, 'new-project');
    const result = await resolveDir(tempDir.path, 'new-project', { dir: target });
    expect(result).toBe(target);
  });

  it('returns expanded directory when it exists but is empty', async () => {
    const target = resolve(tempDir.path, 'empty-project');
    mkdirSync(target);
    const result = await resolveDir(tempDir.path, 'empty-project', { dir: target });
    expect(result).toBe(target);
  });

  it('throws CommandError when directory has files', async () => {
    const target = resolve(tempDir.path, 'occupied');
    mkdirSync(target);
    writeFileSync(resolve(target, 'README.md'), 'existing content');

    await expect(resolveDir(tempDir.path, 'occupied', { dir: target }))
      .rejects.toThrow(CommandError);

    await expect(resolveDir(tempDir.path, 'occupied', { dir: target }))
      .rejects.toThrow('already exists and is not empty');
  });

  it('throws CommandError when path is a file', async () => {
    const filePath = resolve(tempDir.path, 'not-a-dir');
    writeFileSync(filePath, 'I am a file');

    await expect(resolveDir(tempDir.path, 'not-a-dir', { dir: filePath }))
      .rejects.toThrow(CommandError);

    await expect(resolveDir(tempDir.path, 'not-a-dir', { dir: filePath }))
      .rejects.toThrow('exists but is not a directory');
  });

  it('lists up to 5 items in the error message', async () => {
    const target = resolve(tempDir.path, 'full-dir');
    mkdirSync(target);
    for (let i = 0; i < 6; i++) {
      writeFileSync(resolve(target, `file${i}.txt`), '');
    }

    try {
      await resolveDir(tempDir.path, 'full-dir', { dir: target });
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CommandError);
      expect(err.message).toContain('file0.txt');
      expect(err.message).toContain('file4.txt');
      expect(err.message).toContain('...');
    }
  });

  it('uses default ./{name} when --name is set without --dir', async () => {
    const expected = resolve(tempDir.path, 'my-app');
    const result = await resolveDir(tempDir.path, 'my-app', { name: 'my-app' });
    expect(result).toBe(expected);
  });

  it('uses default ./{name} when --modules is set without --dir', async () => {
    const expected = resolve(tempDir.path, 'my-app');
    const result = await resolveDir(tempDir.path, 'my-app', { modules: 'server,web' });
    expect(result).toBe(expected);
  });

  it('prefers --dir over default when both --dir and --name are set', async () => {
    const customDir = resolve(tempDir.path, 'custom-location');
    const result = await resolveDir(tempDir.path, 'my-app', { dir: customDir, name: 'my-app' });
    expect(result).toBe(customDir);
  });

  it('expands ~ to home directory path', async () => {
    const { homedir } = await import('os');
    // Use ~/nonexistent-subdir so it resolves but doesn't trigger the non-empty check
    const result = await resolveDir(tempDir.path, 'test', { dir: '~/nonexistent-test-dir-12345' });
    expect(result).toBe(resolve(homedir(), 'nonexistent-test-dir-12345'));
  });
});
