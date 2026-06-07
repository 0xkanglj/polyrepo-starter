import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, lstatSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

describe('build-skill script', () => {
  it('produces the expected skill directory structure', () => {
    execSync('npm run build-skill', { cwd: REPO_ROOT, stdio: 'pipe' });

    const skillDir = resolve(REPO_ROOT, 'skills/polyrepo-scaffold');

    expect(existsSync(skillDir)).toBe(true);
    expect(existsSync(resolve(skillDir, 'SKILL.md'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'scripts/run.sh'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'scripts/src/cli.js'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'scripts/package.json'))).toBe(true);
    expect(existsSync(resolve(skillDir, 'assets/templates/spec-center'))).toBe(true);

    const runShStat = lstatSync(resolve(skillDir, 'scripts/run.sh'));
    expect(runShStat.mode & 0o111).not.toBe(0);
  });
});
