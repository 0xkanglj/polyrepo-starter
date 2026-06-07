import path from 'path';
import fs from 'fs';
import {
  extractProjectName,
  SPEC_CENTER_SUFFIX,
} from '../utils/path.js';

/**
 * Walk up parent directories to find *-spec-center/ directory
 * @param {string} startDir - starting directory
 * @returns {string|null} full path to spec-center directory
 */
export function findSpecCenter(startDir) {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    try {
      const matches = fs
        .readdirSync(dir)
        .filter(
          (name) =>
            name.endsWith(SPEC_CENTER_SUFFIX) &&
            fs.statSync(path.join(dir, name)).isDirectory()
        );
      if (matches.length > 0) return path.join(dir, matches[0]);
    } catch {
      // Permission denied or other read errors — skip this dir
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Scan workspace for existing modules
 * @param {string} workspaceDir - workspace directory
 * @param {string} projectName - project name
 * @returns {string[]} list of existing module names
 */
export function scanExistingModules(workspaceDir, projectName) {
  const prefix = `${projectName}-`;
  return fs
    .readdirSync(workspaceDir)
    .filter((name) => name.startsWith(prefix) && fs.statSync(path.join(workspaceDir, name)).isDirectory())
    .map((name) => name.slice(prefix.length));
}

/**
 * Detect whether we are in init or add mode
 * @param {string} cwd - current working directory
 * @param {object} options - CLI options
 * @returns {{ mode: 'init'|'add', ctx: object }}
 */
export function detectMode(cwd, options) {
  if (options.name) {
    return { mode: 'init', ctx: {} };
  }

  const specCenterDir = findSpecCenter(cwd);
  if (specCenterDir) {
    const workspaceDir = path.dirname(specCenterDir);
    const projectName = extractProjectName(specCenterDir);
    const existingModules = scanExistingModules(workspaceDir, projectName);
    return {
      mode: 'add',
      ctx: { workspaceDir, projectName, existingModules, specCenterDir },
    };
  }

  return { mode: 'init', ctx: {} };
}
