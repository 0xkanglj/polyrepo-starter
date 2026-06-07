import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const RUN_SH_PATH = resolve(REPO_ROOT, 'skills/polyrepo-scaffold/scripts/run.sh');

describe('run.sh end-to-end', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('creates a workspace using run.sh (init mode)', () => {
    execSync('npm run build-skill', { cwd: REPO_ROOT, stdio: 'pipe' });

    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `bash "${RUN_SH_PATH}" --name acme --dir "${workspace}" --modules spec-center,server`,
      { cwd: tempDir.path, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-server'))).toBe(true);

    const agentsContent = readFileSync(resolve(workspace, 'acme-spec-center', 'AGENTS.md'), 'utf-8');
    expect(agentsContent).not.toContain('{{PROJECT}}');
  });

  it('adds a module using run.sh (add mode)', () => {
    execSync('npm run build-skill', { cwd: REPO_ROOT, stdio: 'pipe' });

    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `bash "${RUN_SH_PATH}" --name acme --dir "${workspace}" --modules spec-center`,
      { cwd: tempDir.path, stdio: 'pipe' }
    );

    execSync(
      `bash "${RUN_SH_PATH}" --modules web`,
      { cwd: workspace, stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'acme-web'))).toBe(true);
  });
});
