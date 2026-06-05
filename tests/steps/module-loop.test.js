import { describe, it, expect, vi, beforeEach } from 'vitest';
import { moduleLoop } from '../../src/steps/module-loop.js';
import { parseModuleList } from '../../src/utils/prompt.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('moduleLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses modules from options.modules string', async () => {
    const ctx = { existingModules: [] };
    const options = { modules: 'server,web' };
    const result = await moduleLoop(ctx, options);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const names = result.map(m => m.name);
    expect(names).toContain('server');
    expect(names).toContain('web');
  });

  it('supports name=template syntax via options.modules', async () => {
    const ctx = { existingModules: [] };
    const options = { modules: 'api=server' };
    const result = await moduleLoop(ctx, options);
    expect(result.some(m => m.name === 'api' && m.templateRef === 'server' && m.isCustom === true)).toBe(true);
  });

  it('appends to initial modules', async () => {
    const ctx = { existingModules: [] };
    const options = { modules: 'web' };
    const initial = [{ name: 'spec-center', templateRef: 'spec-center', isCustom: false }];
    const result = await moduleLoop(ctx, options, initial);
    const names = result.map(m => m.name);
    expect(names).toContain('spec-center');
    expect(names).toContain('web');
  });

  it('skips duplicates from takenNames', async () => {
    const ctx = { existingModules: ['server'] };
    const options = { modules: 'server,web' };
    const result = await moduleLoop(ctx, options);
    const names = result.map(m => m.name);
    // server should not appear (it's in existingModules and parseModuleList skips it)
    expect(names.filter(n => n === 'server').length).toBeLessThanOrEqual(0);
    expect(names).toContain('web');
  });
});
