import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { filterAgentsMd, syncAgentsMd, mergeAgentsMd } from '../../src/core/agents-sync.js';
import { resolveTemplatesDir } from '../../src/utils/path.js';
import { writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import tmp from 'tmp-promise';

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

describe('syncAgentsMd', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('generates AGENTS.md with custom module entries in Module Map and Repository Structure', () => {
    const workspaceDir = tempDir.path;
    const projectName = 'acme';
    const specCenterDir = join(workspaceDir, `${projectName}-spec-center`);
    mkdirSync(specCenterDir, { recursive: true });

    const modules = [
      { name: 'spec-center', templateRef: 'spec-center', isCustom: false },
      { name: 'server', templateRef: 'server', isCustom: false },
      { name: 'crawler', templateRef: 'server', isCustom: true },
    ];

    syncAgentsMd(workspaceDir, projectName, modules);

    const agentsPath = join(specCenterDir, 'AGENTS.md');
    const content = readFileSync(agentsPath, 'utf-8');

    // Module Map should contain both server and crawler
    expect(content).toContain('`server`');
    expect(content).toContain('`crawler`');

    // Repository Structure should contain both directories
    expect(content).toContain('acme-server/');
    expect(content).toContain('acme-crawler/');

    // Custom module should have its own role name (not "Server application")
    expect(content).toContain('Crawler application');

    // Markers should be stripped
    expect(content).not.toMatch(/<!-- MODULE:/);
    expect(content).not.toMatch(/<!-- BEGIN MODULE:/);
  });

  it('handles only built-in modules without custom modules', () => {
    const workspaceDir = tempDir.path;
    const projectName = 'myapp';
    const specCenterDir = join(workspaceDir, `${projectName}-spec-center`);
    mkdirSync(specCenterDir, { recursive: true });

    const modules = [
      { name: 'spec-center', templateRef: 'spec-center', isCustom: false },
      { name: 'web', templateRef: 'web', isCustom: false },
    ];

    syncAgentsMd(workspaceDir, projectName, modules);

    const agentsPath = join(specCenterDir, 'AGENTS.md');
    const content = readFileSync(agentsPath, 'utf-8');

    expect(content).toContain('`web`');
    expect(content).toContain('myapp-web/');
    expect(content).not.toContain('{{PROJECT}}');
  });
});

describe('mergeAgentsMd', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('adds built-in module with role comment in Repository Structure', () => {
    const workspaceDir = tempDir.path;
    const projectName = 'acme';
    const specCenterDir = join(workspaceDir, `${projectName}-spec-center`);
    mkdirSync(specCenterDir, { recursive: true });

    // Create a minimal existing AGENTS.md
    const agentsPath = join(specCenterDir, 'AGENTS.md');
    writeFileSync(agentsPath, `# Spec Center

### Module Map

| Module | Role |
|---|---|
| \`spec-center\` | SSOT |

## Repository Structure

\`\`\`
workspace/
├── acme-spec-center/
\`\`\`
`, 'utf-8');

    mergeAgentsMd(workspaceDir, projectName, [
      { name: 'web', templateRef: 'web', isCustom: false },
    ]);

    const content = readFileSync(agentsPath, 'utf-8');

    // Module Map should have web
    expect(content).toContain('| `web` |');
    expect(content).toContain('Web application');

    // Repository Structure should have role comment
    expect(content).toContain('acme-web/');
    expect(content).toContain('# Web application');
  });

  it('adds custom module with capitalized role name', () => {
    const workspaceDir = tempDir.path;
    const projectName = 'acme';
    const specCenterDir = join(workspaceDir, `${projectName}-spec-center`);
    mkdirSync(specCenterDir, { recursive: true });

    const agentsPath = join(specCenterDir, 'AGENTS.md');
    writeFileSync(agentsPath, `# Spec Center

### Module Map

| Module | Role |
|---|---|
| \`spec-center\` | SSOT |

## Repository Structure

\`\`\`
workspace/
├── acme-spec-center/
\`\`\`
`, 'utf-8');

    mergeAgentsMd(workspaceDir, projectName, [
      { name: 'crawler', templateRef: 'server', isCustom: true },
    ]);

    const content = readFileSync(agentsPath, 'utf-8');

    // Role should be "Crawler application", not "Server application"
    expect(content).toContain('`crawler`');
    expect(content).toContain('Crawler application');
    expect(content).not.toContain('Server application');

    // Tree entry should have role comment
    expect(content).toContain('acme-crawler/');
    expect(content).toContain('# Crawler application');
  });
});
