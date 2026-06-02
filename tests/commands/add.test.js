import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('add command integration', () => {
  let tempDir;
  let workspaceDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
    workspaceDir = resolve(tempDir.path, 'acme');

    execSync(
      `node "${CLI_PATH}" init -n acme -d "${workspaceDir}" -m spec-center --templates-dir "${TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('adds a module to existing workspace', () => {
    execSync(
      `node "${CLI_PATH}" add -m web --templates-dir "${TEMPLATES_DIR}"`,
      { cwd: workspaceDir, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspaceDir, 'acme-web'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-web', 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspaceDir, 'acme-web', '.git'))).toBe(true);

    const agentsContent = readFileSync(resolve(workspaceDir, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).toContain('`web`');
  });

  it('skips already existing module with warning', () => {
    const output = execSync(
      `node "${CLI_PATH}" add -m spec-center --templates-dir "${TEMPLATES_DIR}"`,
      { cwd: workspaceDir, encoding: 'utf-8' }
    );

    expect(output).toContain('already exist');
  });

  it('shows dry-run without creating files for --modules', () => {
    const output = execSync(
      `node "${CLI_PATH}" add -m web --dry-run --templates-dir "${TEMPLATES_DIR}"`,
      { cwd: workspaceDir, encoding: 'utf-8' }
    );

    expect(output).toContain('Would create: acme-web/');
    expect(existsSync(resolve(workspaceDir, 'acme-web'))).toBe(false);
  });

  it('fails when not in a workspace', () => {
    try {
      execSync(
        `node "${CLI_PATH}" add -m web --templates-dir "${TEMPLATES_DIR}"`,
        { cwd: tempDir.path, stdio: 'pipe' }
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.stderr?.toString() || err.message).toContain('Not in a workspace');
    }
  });
});
