import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseModuleList, promptModuleName } from '../../src/utils/prompt.js';
import { input } from '@inquirer/prompts';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
}));

describe('parseModuleList', () => {
  it('parses comma-separated module names', () => {
    const result = parseModuleList('server,web,client');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
      { name: 'client', templateRef: 'client', isCustom: false },
    ]);
  });

  it('parses name=template syntax', () => {
    const result = parseModuleList('api=server');
    expect(result).toEqual([
      { name: 'api', templateRef: 'server', isCustom: true },
    ]);
  });

  it('parses mixed plain and name=template', () => {
    const result = parseModuleList('server,api=server,web');
    expect(result).toEqual([
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'api', templateRef: 'server', isCustom: true },
      { name: 'web', templateRef: 'web', isCustom: false },
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

  it('trims whitespace in name=template', () => {
    const result = parseModuleList(' api = server ');
    expect(result).toEqual([
      { name: 'api', templateRef: 'server', isCustom: true },
    ]);
  });

  it('skips duplicate names', () => {
    const result = parseModuleList('server,server');
    // First server is valid, second is a duplicate in takenNames
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('server');
  });

  it('skips names in takenNames', () => {
    const result = parseModuleList('server', ['server']);
    expect(result).toEqual([]);
  });

  it('skips invalid template names', () => {
    const result = parseModuleList('nonexistent');
    expect(result).toEqual([]);
  });

  it('skips invalid name format', () => {
    const result = parseModuleList('INVALID');
    expect(result).toEqual([]);
  });

  it('skips empty name in name=template', () => {
    const result = parseModuleList('=server');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    const result = parseModuleList('');
    expect(result).toEqual([]);
  });
});

describe('promptModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns isCustom=false when name equals templateName', async () => {
    input.mockResolvedValueOnce('server');
    const result = await promptModuleName('server', [], []);
    expect(result).toEqual({
      name: 'server',
      templateRef: 'server',
      isCustom: false,
    });
  });

  it('returns isCustom=true when name differs from templateName', async () => {
    input.mockResolvedValueOnce('crawler');
    const result = await promptModuleName('server', [], []);
    expect(result).toEqual({
      name: 'crawler',
      templateRef: 'server',
      isCustom: true,
    });
  });

  it('rejects empty name', async () => {
    input.mockResolvedValueOnce('');
    const result = await promptModuleName('server', [], []);
    const validateFn = input.mock.calls[0][0].validate;
    expect(validateFn('')).toBe('Module name cannot be empty');
  });

  it('rejects name that conflicts with existing module', async () => {
    input.mockResolvedValueOnce('server');
    await promptModuleName('server', ['server'], []);
    const validateFn = input.mock.calls[0][0].validate;
    expect(validateFn('server')).toBe('Module name "server" is already taken');
  });

  it('rejects name that conflicts with session-added module', async () => {
    input.mockResolvedValueOnce('crawler');
    await promptModuleName('server', [], ['crawler']);
    const validateFn = input.mock.calls[0][0].validate;
    expect(validateFn('crawler')).toBe('Module name "crawler" is already taken');
  });

  it('rejects invalid name format', async () => {
    input.mockResolvedValueOnce('INVALID');
    await promptModuleName('server', [], []);
    const validateFn = input.mock.calls[0][0].validate;
    expect(typeof validateFn('INVALID')).toBe('string');
  });

  it('provides no default when template name is taken', async () => {
    input.mockResolvedValueOnce('myserver');
    await promptModuleName('server', ['server'], []);
    expect(input.mock.calls[0][0].default).toBeUndefined();
  });

  it('provides template name as default when not taken', async () => {
    input.mockResolvedValueOnce('server');
    await promptModuleName('server', [], []);
    expect(input.mock.calls[0][0].default).toBe('server');
  });
});
