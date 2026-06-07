import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(__dirname, '../../src/cli.js');
const REAL_TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('--templates-dir option', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it('resolves templates from a custom --templates-dir', () => {
    const workspace = resolve(tempDir.path, 'acme');
    execSync(
      `node "${CLI_PATH}" -n acme -d "${workspace}" -m spec-center,server --templates-dir "${REAL_TEMPLATES_DIR}"`,
      { stdio: 'pipe' }
    );

    expect(existsSync(resolve(workspace, 'AGENTS.md'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-spec-center'))).toBe(true);
    expect(existsSync(resolve(workspace, 'acme-server'))).toBe(true);
  });

  it('fails gracefully with non-existent --templates-dir', () => {
    const workspace = resolve(tempDir.path, 'acme');
    expect(() => {
      execSync(
        `node "${CLI_PATH}" -n acme -d "${workspace}" -m spec-center --templates-dir "/nonexistent/path"`,
        { stdio: 'pipe' }
      );
    }).toThrow();
  });
});
