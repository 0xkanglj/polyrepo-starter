import { describe, it, expect } from 'vitest';
import { filterAgentsMd } from '../../src/core/agents-sync.js';

// A realistic mini-template matching the actual spec-center/AGENTS.md structure
const TEMPLATE = `# Spec Center (SSOT)

## Architecture

### Module Map

| Module | Role |
|---|---|
<!-- MODULE:admin -->| \`admin\` | Admin manager application|
<!-- MODULE:mobile -->| \`mobile\` | Mobile application |
<!-- MODULE:server -->| \`server\` | Backend service implementation |
| \`spec-center\` | **Single Source of Truth (SSOT)** for cross-module contracts and constraints |
<!-- MODULE:web -->| \`web\` | Web application|

## Some Content

| Document | Where | Example |
|---|---|---|
| Cross-module domain spec (what) | \`spec-center/docs/specs/\` | \`2026-05-30-feature-design.md\` |
<!-- MODULE:server -->| Server implementation plan (how) | \`server/docs/plans/\` | \`2026-05-30-feature.md\` |
<!-- MODULE:web -->| Web implementation plan (how) | \`web/docs/plans/\` | \`2026-05-30-feature.md\` |

## Repository Structure

\`\`\`
workspace/
├── AGENTS.md
├── {{PROJECT}}-spec-center/
<!-- BEGIN MODULE:server -->├── {{PROJECT}}-server/
│   ├── AGENTS.md
│   └── docs/
│       ├── specs/
│       └── plans/
<!-- END MODULE:server -->
<!-- BEGIN MODULE:web -->├── {{PROJECT}}-web/
│   └── ...
<!-- END MODULE:web -->
<!-- BEGIN MODULE:mobile -->├── {{PROJECT}}-mobile/
│   └── ...
<!-- END MODULE:mobile -->
<!-- BEGIN MODULE:admin -->└── {{PROJECT}}-admin/
    └── ...
<!-- END MODULE:admin -->
\`\`\`
`;

describe('filterAgentsMd', () => {
  it('keeps only spec-center when only spec-center selected', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center']);
    expect(result).toContain('| `spec-center` |');
    expect(result).not.toContain('<!-- MODULE:admin -->');
    expect(result).not.toContain('<!-- MODULE:server -->');
    expect(result).not.toContain('<!-- MODULE:web -->');
    expect(result).not.toContain('<!-- MODULE:mobile -->');
    expect(result).not.toContain('`admin`');
    expect(result).not.toContain('`server`');
    expect(result).not.toContain('`web`');
    expect(result).not.toContain('`mobile`');
    expect(result).toContain('SSOT');
    expect(result).not.toContain('{{PROJECT}}-server/');
    expect(result).not.toContain('{{PROJECT}}-web/');
    expect(result).not.toContain('{{PROJECT}}-mobile/');
    expect(result).not.toContain('{{PROJECT}}-admin/');
  });

  it('keeps selected modules and removes others', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server', 'web']);
    expect(result).toContain('| `spec-center` |');
    expect(result).toContain('| `server` |');
    expect(result).toContain('| `web` |');
    expect(result).not.toContain('`admin`');
    expect(result).not.toContain('`mobile`');
    expect(result).toContain('{{PROJECT}}-server/');
    expect(result).toContain('{{PROJECT}}-web/');
    expect(result).not.toContain('{{PROJECT}}-mobile/');
    expect(result).not.toContain('{{PROJECT}}-admin/');
  });

  it('keeps all content when all modules selected', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server', 'web', 'mobile', 'admin']);
    expect(result).toContain('| `spec-center` |');
    expect(result).toContain('| `server` |');
    expect(result).toContain('| `web` |');
    expect(result).toContain('| `mobile` |');
    expect(result).toContain('| `admin` |');
    expect(result).toContain('{{PROJECT}}-server/');
    expect(result).toContain('{{PROJECT}}-web/');
    expect(result).toContain('{{PROJECT}}-mobile/');
    expect(result).toContain('{{PROJECT}}-admin/');
  });

  it('strips MODULE markers from kept lines', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server']);
    expect(result).not.toMatch(/<!-- MODULE:/);
    expect(result).toContain('| `server` | Backend service implementation |');
  });

  it('strips BEGIN/END markers from kept blocks', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'server']);
    expect(result).not.toMatch(/<!-- BEGIN MODULE:/);
    expect(result).not.toMatch(/<!-- END MODULE:/);
  });

  it('preserves lines without any markers', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center']);
    expect(result).toContain('## Architecture');
    expect(result).toContain('Cross-module domain spec');
    expect(result).toContain('workspace/');
  });

  it('handles custom module names in filter', () => {
    const result = filterAgentsMd(TEMPLATE, ['spec-center', 'crawler']);
    expect(result).toContain('| `spec-center` |');
    expect(result).not.toContain('`server`');
  });
});
