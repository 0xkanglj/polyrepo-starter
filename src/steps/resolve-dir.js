import fs from 'fs';
import path from 'path';
import { expandHome } from '../utils/path.js';
import { promptDir } from '../utils/prompt.js';
import { CommandError } from '../utils/errors.js';

/**
 * Check whether a directory is non-empty (has any visible or hidden files).
 * @param {string} dirPath - absolute path to check
 * @returns {boolean} true if directory exists and has content
 */
export function isDirNonEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) return false;
  if (!fs.statSync(dirPath).isDirectory()) return true;
  const entries = fs.readdirSync(dirPath);
  return entries.length > 0;
}

/**
 * Resolve the workspace directory for init mode.
 * Validates that the target directory either does not exist or is empty.
 */
export async function resolveDir(cwd, projectName, options) {
  const rawDir = options.dir
    ? options.dir
    : await promptDir(path.join(cwd, projectName));

  const dir = expandHome(rawDir);

  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) {
    throw new CommandError(`Path "${dir}" exists but is not a directory.`);
  }

  if (isDirNonEmpty(dir)) {
    const contents = fs.readdirSync(dir);
    throw new CommandError(
      `Target directory "${dir}" already exists and is not empty.\n` +
      `  Found ${contents.length} item(s): ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? ', ...' : ''}\n` +
      `  Please choose an empty directory or remove existing files first.`,
    );
  }

  return dir;
}
