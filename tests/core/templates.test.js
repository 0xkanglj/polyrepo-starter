import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAvailableTemplateNames, getModuleRole, validateTemplate } from '../../src/core/templates.js';
import { setGlobalTemplatesDir, resetGlobalTemplatesDir } from '../../src/utils/path.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, '../../templates');

describe('templates', () => {
  beforeEach(() => {
    setGlobalTemplatesDir(TEMPLATES_DIR);
  });

  afterEach(() => {
    resetGlobalTemplatesDir();
  });

  describe('getAvailableTemplateNames', () => {
    it('returns all template names except root', () => {
      const names = getAvailableTemplateNames();
      expect(names).toContain('spec-center');
      expect(names).toContain('server');
      expect(names).toContain('web');
      expect(names).toContain('mobile');
      expect(names).toContain('admin');
      expect(names).not.toContain('root');
    });
  });

  describe('getModuleRole', () => {
    it('returns Role from server template', () => {
      const role = getModuleRole('server');
      expect(role).toBe('Server application');
    });

    it('returns Role from web template', () => {
      const role = getModuleRole('web');
      expect(role).toBe('Web application');
    });

    it('returns Role from mobile template', () => {
      const role = getModuleRole('mobile');
      expect(role).toBe('Mobile application');
    });

    it('returns Role from admin template', () => {
      const role = getModuleRole('admin');
      expect(role).toBe('Admin manager application');
    });
  });

  describe('validateTemplate', () => {
    it('returns true for valid template', () => {
      expect(validateTemplate('server')).toBe(true);
    });

    it('throws for non-existent template', () => {
      expect(() => validateTemplate('nonexistent')).toThrow('Template not found: nonexistent');
    });
  });
});