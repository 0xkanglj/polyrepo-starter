import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');

describe('scaffold command — init mode', () => {
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
      `node "${CLI_PATH}" -n acme -d "${workspace}" -m spec-center`,
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
      `node "${CLI_PATH}" -n myapp -d "${workspace}" -m spec-center,server,web`,
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

  it('creates workspace with name=template syntax', () => {
    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `node "${CLI_PATH}" -n acme -d "${workspace}" -m spec-center,api=server`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-api'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-server'))).toBe(false);

    const agentsContent = readFileSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('acme-api');
  });

  it('shows dry-run without creating files', () => {
    const workspace = resolve(tempDir.path, 'dry-test');
    const output = execSync(
      `node "${CLI_PATH}" -n drytest -d "${workspace}" -m spec-center --dry-run`,
      { encoding: 'utf-8' }
    );

    expect(output).toContain('DRY RUN');
    expect(existsSync(workspace)).toBe(false);
  });

  it('auto-includes spec-center if not specified', () => {
    const workspace = resolve(tempDir.path, 'auto-sc');
    execSync(
      `node "${CLI_PATH}" -n autosc -d "${workspace}" -m server`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'autosc-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'autosc-server'))).toBe(true);
  });
});

describe('scaffold command — add mode', () => {
  let tempDir;
  let workspaceDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
    workspaceDir = resolve(tempDir.path, 'acme');

    execSync(
      `node "${CLI_PATH}" -n acme -d "${workspaceDir}" -m spec-center`,
      { stdio: 'pipe' }
    );
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('adds a module to existing workspace', () => {
    execSync(
      `node "${CLI_PATH}" -m web`,
      { cwd: workspaceDir, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspaceDir, 'acme-web'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-web', 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-web', '.git'))).toBe(true);

    const agentsContent = readFileSync(resolve(workspaceDir, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('`acme-web`');
  });

  it('adds a renamed module to existing workspace', () => {
    execSync(
      `node "${CLI_PATH}" -m api=server`,
      { cwd: workspaceDir, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspaceDir, 'acme-api'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-server'))).toBe(false);
  });

  it('skips already existing module with warning', () => {
    const output = execSync(
      `node "${CLI_PATH}" -m spec-center`,
      { cwd: workspaceDir, encoding: 'utf-8' }
    );

    expect(output).toContain('already exist');
  });

  it('shows dry-run without creating files', () => {
    const output = execSync(
      `node "${CLI_PATH}" -m web --dry-run`,
      { cwd: workspaceDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Would create: acme-web/');
    expect(existsSync(resolve(workspaceDir, 'acme-web'))).toBe(false);
  });

  it('fails when not in a workspace', () => {
    try {
      execSync(
        `node "${CLI_PATH}" -m web`,
        { cwd: tempDir.path, stdio: 'pipe' }
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      const output = err.stderr?.toString() || err.message;
      expect(output.length).toBeGreaterThan(0);
    }
  });
});
