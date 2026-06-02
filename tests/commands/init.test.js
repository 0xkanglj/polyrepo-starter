import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('init command integration', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('creates workspace with spec-center only (non-interactive)', () => {
    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `node "${CLI_PATH}" init -n acme -d "${workspace}" -m spec-center --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center', '.git'))).toBe(true);

    const agentsContent = readFileSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).not.toContain('{{PROJECT}}');
    expect(agentsContent).toContain('acme-spec-center');

    expect(agentsContent).not.toContain('`server`');
    expect(agentsContent).not.toContain('`web`');
    expect(agentsContent).not.toContain('`mobile`');
    expect(agentsContent).not.toContain('`admin`');
  });

  it('creates workspace with multiple modules (non-interactive)', () => {
    const workspace = resolve(tempDir.path, 'myapp');
    execSync(
      `node "${CLI_PATH}" init -n myapp -d "${workspace}" -m spec-center,server,web --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'myapp-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'myapp-server'))).toBe(true);
    expect(existsSync(resolve(workspace, 'myapp-web'))).toBe(true);
    expect(existsSync(resolve(workspace, 'myapp-mobile'))).toBe(false);
    expect(existsSync(resolve(workspace, 'myapp-admin'))).toBe(false);

    const agentsContent = readFileSync(resolve(workspace, 'myapp-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('| `myapp-server`');
    expect(agentsContent).toContain('| `myapp-web`');
    expect(agentsContent).not.toContain('| `myapp-mobile`');
    expect(agentsContent).not.toContain('| `myapp-admin`');
  });

  it('shows dry-run without creating files', () => {
    const workspace = resolve(tempDir.path, 'dry-test');
    const output = execSync(
      `node "${CLI_PATH}" init -n drytest -d "${workspace}" -m spec-center --dry-run --templates-dir "${TEMPLATES_DIR}"`,
      { encoding: 'utf-8' }
    );

    expect(output).toContain('DRY RUN');
    expect(existsSync(workspace)).toBe(false);
  });

  it('auto-includes spec-center if not specified', () => {
    const workspace = resolve(tempDir.path, 'auto-sc');
    execSync(
      `node "${CLI_PATH}" init -n autosc -d "${workspace}" -m server --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'autosc-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'autosc-server'))).toBe(true);
  });
});
