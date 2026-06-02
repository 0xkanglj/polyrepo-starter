import { describe, it, expect, vi } from 'vitest';
import { parseModuleList } from '../../src/utils/prompt.js';

describe('parseModuleList', () => {
  it('parses comma-separated module names', () => {
    const result = parseModuleList('server,web,mobile');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
      { name: 'mobile', templateRef: 'mobile', isCustom: false },
    ]);
  });

  it('filters empty items from the list', () => {
    const result = parseModuleList('server,,web,');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
    ]);
  });

  it('trims whitespace around names', () => {
    const result = parseModuleList(' server , web ');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
    ]);
  });

  it('returns empty array for empty string', () => {
    const result = parseModuleList('');
    expect(result).toEqual([]);
  });
});