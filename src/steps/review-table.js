import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';
import { getAvailableTemplateNames } from '../core/templates.js';
import { promptModuleName } from '../utils/prompt.js';
import { SPEC_CENTER_NAME } from '../utils/path.js';
import { validateProjectName } from '../utils/path.js';
import { warn } from '../utils/logger.js';

function _displayTable(modules, ctx) {
  console.log('');
  console.log(chalk.bold('  Modules to create:'));
  console.log('  ┌─────┬──────────────────────┬──────────────────────┬──────────┐');
  console.log('  │ #   │ Module               │ Template             │ Status   │');
  console.log('  ├─────┼──────────────────────┼──────────────────────┼──────────┤');
  modules.forEach((mod, i) => {
    const idx = String(i + 1).padEnd(3);
    const name = mod.name.padEnd(20);
    const template = (mod.isCustom ? mod.templateRef : '—').padEnd(20);
    const status = (ctx.existingModules && ctx.existingModules.includes(mod.name))
      ? chalk.yellow('existing'.padEnd(8))
      : chalk.green('new'.padEnd(8));
    console.log(`  │ ${idx} │ ${name} │ ${template} │ ${status} │`);
  });
  console.log('  └─────┴──────────────────────┴──────────────────────┴──────────┘');
  console.log('');
}

export async function reviewTable(ctx, options, modules) {
  // Non-interactive: skip review
  if (options.modules) {
    return modules.map(m => ({ ...m, removable: false }));
  }

  let currentModules = [...modules];

  while (true) {
    _displayTable(currentModules, ctx);

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { name: '✅ Confirm and proceed', value: 'confirm' },
        { name: '📝 Edit module name', value: 'edit' },
        { name: '🗑️  Remove a module', value: 'remove' },
        { name: '➕ Add another module', value: 'add' },
      ],
    });

    if (action === 'confirm') {
      return currentModules;
    }

    if (action === 'remove') {
      const removable = currentModules.filter(m => m.name !== SPEC_CENTER_NAME);
      if (removable.length === 0) {
        warn('No removable modules (spec-center cannot be removed).');
        continue;
      }
      const toRemove = await select({
        message: 'Select module to remove:',
        choices: removable.map(m => ({ name: `${m.name}${m.isCustom ? ` (based on ${m.templateRef})` : ''}`, value: m.name })),
      });
      currentModules = currentModules.filter(m => m.name !== toRemove);
      continue;
    }

    if (action === 'edit') {
      const editable = currentModules.filter(m => m.name !== SPEC_CENTER_NAME);
      if (editable.length === 0) {
        warn('No editable modules (spec-center name cannot be changed).');
        continue;
      }
      const toEdit = await select({
        message: 'Select module to rename:',
        choices: editable.map(m => ({ name: m.name, value: m.name })),
      });
      const mod = currentModules.find(m => m.name === toEdit);
      const newName = await input({
        message: `New name for "${toEdit}":`,
        default: mod.name,
        validate: (value) => {
          const name = value.trim();
          if (!name) return 'Name cannot be empty';
          const v = validateProjectName(name);
          if (v !== true) return v;
          const allNames = currentModules.filter(m => m.name !== toEdit).map(m => m.name);
          if (allNames.includes(name)) return `Name "${name}" is already taken`;
          return true;
        },
      });
      const trimmed = newName.trim();
      mod.name = trimmed;
      mod.isCustom = trimmed !== mod.templateRef;
      continue;
    }

    if (action === 'add') {
      const templates = getAvailableTemplateNames().filter(t => t !== SPEC_CENTER_NAME && t !== 'root');
      if (templates.length === 0) {
        warn('No templates available to add.');
        continue;
      }
      const templateName = await select({
        message: 'Select a module to add:',
        choices: templates.map(t => ({ name: t, value: t })),
      });
      const takenNames = currentModules.map(m => m.name);
      const mod = await promptModuleName(templateName, takenNames, []);
      currentModules.push(mod);
      continue;
    }
  }
}
