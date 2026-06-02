import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyAndReplace, gitInit, mkdirIfNeeded } from '../../src/core/scaffold.js';
import { setGlobalTemplatesDir, resetGlobalTemplatesDir } from '../../src/utils/path.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import tmp from 'tmp-promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('scaffold', () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
    setGlobalTemplatesDir(TEMPLATES_DIR);
  });

  afterEach(async () => {
    resetGlobalTemplatesDir();
    await tempDir.cleanup();
  });

  describe('mkdirIfNeeded', () => {
    it('creates directory if it does not exist', () => {
      const target = resolve(tempDir.path, 'new-dir');
      expect(existsSync(target)).toBe(false);
      mkdirIfNeeded(target);
      expect(existsSync(target)).toBe(true);
    });

    it('does not throw if directory already exists', () => {
      const target = resolve(tempDir.path, 'existing-dir');
      mkdirSync(target);
      expect(existsSync(target)).toBe(true);
      expect(() => mkdirIfNeeded(target)).not.toThrow();
    });
  });

  describe('copyAndReplace', () => {
    it('copies template directory to target', () => {
      const target = resolve(tempDir.path, 'server');
      copyAndReplace('server', target, { PROJECT: 'acme' });
      expect(existsSync(resolve(target, 'AGENTS.md'))).toBe(true);
      expect(existsSync(resolve(target, 'Makefile'))).toBe(true);
      expect(existsSync(resolve(target, '.gitignore'))).toBe(true);
    });

    it('replaces {{PROJECT}} in text files', () => {
      const target = resolve(tempDir.path, 'server');
      copyAndReplace('server', target, { PROJECT: 'acme' });
      const agentsContent = readFileSync(resolve(target, 'AGENTS.md'), 'utf-8');
      expect(agentsContent).toContain('acme-server');
      expect(agentsContent).not.toContain('{{PROJECT}}');
    });

    it('replaces template ref for custom modules', () => {
      const target = resolve(tempDir.path, 'crawler');
      copyAndReplace('server', target, {
        PROJECT: 'acme',
        MODULE_NAME: 'crawler',
        TEMPLATE_REF: 'server',
      });
      const agentsContent = readFileSync(resolve(target, 'AGENTS.md'), 'utf-8');
      expect(agentsContent).toContain('acme-crawler');
      expect(agentsContent).not.toContain('acme-server');
    });

    it('copies dotfiles correctly', () => {
      const target = resolve(tempDir.path, 'web');
      copyAndReplace('web', target, { PROJECT: 'myapp' });
      expect(existsSync(resolve(target, '.gitignore'))).toBe(true);
      expect(existsSync(resolve(target, '.cursorignore'))).toBe(true);
    });
  });

  describe('gitInit', () => {
    it('initializes git repo with main branch and commit', async () => {
      const target = resolve(tempDir.path, 'test-module');
      mkdirSync(target);
      writeFileSync(resolve(target, 'test.txt'), 'hello');
      gitInit(target, 'test-module');

      expect(existsSync(resolve(target, '.git'))).toBe(true);
      const { execSync } = await import('child_process');
      const log = execSync('git log --oneline', { cwd: target, encoding: 'utf-8' });
      expect(log).toContain('chore: initialize test-module from scaffold');
    });
  });
});
