import { promptName } from '../utils/prompt.js';
import { validateProjectName } from '../utils/path.js';
import { CommandError } from '../utils/errors.js';

export async function resolveName(options) {
  if (options.name) {
    const validation = validateProjectName(options.name);
    if (validation !== true) throw new CommandError(`Invalid project name: ${validation}`);
    return options.name;
  }
  return promptName();
}
