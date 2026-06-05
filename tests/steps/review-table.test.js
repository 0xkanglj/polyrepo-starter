import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reviewTable } from '../../src/steps/review-table.js';

vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
  input: vi.fn(),
}));

describe('reviewTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips review in non-interactive mode (options.modules set)', async () => {
    const ctx = { existingModules: [] };
    const options = { modules: 'server,web' };
    const modules = [
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
    ];
    const result = await reviewTable(ctx, options, modules);
    expect(result).toHaveLength(2);
    expect(result.every(m => m.removable === false)).toBe(true);
  });

  it('returns modules unchanged in non-interactive mode', async () => {
    const ctx = { existingModules: [] };
    const options = { modules: 'server' };
    const modules = [
      { name: 'spec-center', templateRef: 'spec-center', isCustom: false },
      { name: 'server', templateRef: 'server', isCustom: false },
    ];
    const result = await reviewTable(ctx, options, modules);
    expect(result.map(m => m.name)).toEqual(['spec-center', 'server']);
  });
});
