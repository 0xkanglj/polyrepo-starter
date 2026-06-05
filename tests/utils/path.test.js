import { describe, it, expect } from 'vitest';
import { expandHome, validateProjectName, extractProjectName } from '../../src/utils/path.js';
import { homedir } from 'os';
import { resolve } from 'path';

describe('expandHome', () => {
  it('expands ~/ to home directory', () => {
    const result = expandHome('~/projects/acme');
    expect(result).toBe(resolve(homedir(), 'projects/acme'));
  });

  it('resolves relative paths to absolute', () => {
    const result = expandHome('./acme');
    expect(result).toBe(resolve('./acme'));
  });

  it('keeps absolute paths unchanged', () => {
    const result = expandHome('/Users/kang/projects/acme');
    expect(result).toBe('/Users/kang/projects/acme');
  });

  it('handles ~ without slash', () => {
    const result = expandHome('~');
    expect(result).toBe(homedir());
  });
});

describe('validateProjectName', () => {
  it('accepts valid lowercase names', () => {
    expect(validateProjectName('acme')).toBe(true);
    expect(validateProjectName('my-project')).toBe(true);
    expect(validateProjectName('a1')).toBe(true);
    expect(validateProjectName('project-123')).toBe(true);
  });

  it('rejects names starting with digit', () => {
    expect(validateProjectName('1project')).toBe('Must start with lowercase letter, only lowercase/digits/hyphens');
  });

  it('rejects uppercase letters', () => {
    expect(validateProjectName('Acme')).toBe('Must start with lowercase letter, only lowercase/digits/hyphens');
  });

  it('rejects underscores', () => {
    expect(validateProjectName('my_project')).toBe('Must start with lowercase letter, only lowercase/digits/hyphens');
  });

  it('rejects names shorter than 2 characters', () => {
    expect(validateProjectName('a')).toBe('Must be 2-50 characters');
  });

  it('rejects names longer than 50 characters', () => {
    expect(validateProjectName('a'.repeat(51))).toBe('Must be 2-50 characters');
  });

  it('rejects trailing hyphen', () => {
    expect(validateProjectName('project-')).toBe('Must start with lowercase letter, only lowercase/digits/hyphens');
  });

  it('rejects consecutive hyphens', () => {
    expect(validateProjectName('my--project')).toBe('Must start with lowercase letter, only lowercase/digits/hyphens');
  });

  it('accepts exactly 2 characters', () => {
    expect(validateProjectName('ab')).toBe(true);
  });

  it('accepts exactly 50 characters', () => {
    const name = 'a' + '-bc'.repeat(16) + 'x'; // 1 + 48 + 1 = 50
    expect(name.length).toBe(50);
    expect(validateProjectName(name)).toBe(true);
  });
});

describe('extractProjectName', () => {
  it('extracts project name from spec-center directory path', () => {
    expect(extractProjectName('/Users/kang/projects/acme/acme-spec-center')).toBe('acme');
  });

  it('extracts project name from directory with multiple hyphens', () => {
    expect(extractProjectName('/projects/my-cool-app/my-cool-app-spec-center')).toBe('my-cool-app');
  });

  it('works with relative paths', () => {
    expect(extractProjectName('acme-spec-center')).toBe('acme');
  });
});