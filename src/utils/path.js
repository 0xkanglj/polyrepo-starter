import { homedir } from 'os';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = resolve(__dirname, '../../templates');

let globalTemplatesDir = null;

export const SPEC_CENTER_NAME = 'spec-center';
export const SPEC_CENTER_SUFFIX = '-spec-center';

export function setGlobalTemplatesDir(dir) {
  globalTemplatesDir = dir;
}

export function resetGlobalTemplatesDir() {
  globalTemplatesDir = null;
}

export function getGlobalTemplatesDir() {
  return globalTemplatesDir;
}

export function resolveTemplatesDir(...subPaths) {
  const base = globalTemplatesDir || DEFAULT_TEMPLATES_DIR;
  return resolve(base, ...subPaths);
}

export function expandHome(inputPath) {
  if (inputPath.startsWith('~')) {
    return resolve(inputPath.replace(/^~/, homedir()));
  }
  return resolve(inputPath);
}

const PROJECT_NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function validateProjectName(name) {
  if (!PROJECT_NAME_REGEX.test(name)) {
    return 'Must start with lowercase letter, only lowercase/digits/hyphens';
  }
  if (name.length < 2 || name.length > 50) {
    return 'Must be 2-50 characters';
  }
  return true;
}

export function extractProjectName(specCenterDir) {
  const dirName = basename(specCenterDir);
  return dirName.slice(0, -SPEC_CENTER_SUFFIX.length);
}