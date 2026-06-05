import path from 'path';
import { expandHome } from '../utils/path.js';
import { promptDir } from '../utils/prompt.js';

export async function resolveDir(cwd, projectName, options) {
  if (options.dir) return expandHome(options.dir);
  const defaultDir = path.join(cwd, projectName);
  const dirInput = await promptDir(defaultDir);
  return expandHome(dirInput);
}
