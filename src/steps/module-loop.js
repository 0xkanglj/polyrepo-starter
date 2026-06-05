import { select, confirm } from '@inquirer/prompts';
import { getAvailableTemplateNames } from '../core/templates.js';
import { parseModuleList, promptModuleName } from '../utils/prompt.js';
import { SPEC_CENTER_NAME } from '../utils/path.js';

export async function moduleLoop(ctx, options, initialModules = []) {
  const takenNames = [...ctx.existingModules, ...initialModules.map(m => m.name)];

  if (options.modules) {
    const parsed = parseModuleList(options.modules, takenNames);
    return [...initialModules, ...parsed];
  }

  const modules = [...initialModules];
  const templates = getAvailableTemplateNames().filter(t => t !== SPEC_CENTER_NAME && t !== 'root');
  const sessionAddedNames = initialModules.map(m => m.name);

  while (true) {
    if (templates.length === 0) break;
    const templateName = await select({
      message: 'Select a module to add:',
      choices: templates.map(t => ({ name: t, value: t })),
    });
    const mod = await promptModuleName(templateName, [...takenNames], sessionAddedNames);
    modules.push(mod);
    takenNames.push(mod.name);
    sessionAddedNames.push(mod.name);
    const more = await confirm({ message: 'Add another module?', default: true });
    if (!more) break;
  }
  return modules;
}
