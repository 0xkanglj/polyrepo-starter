import { input, checkbox, confirm, select } from '@inquirer/prompts';
import { validateProjectName, SPEC_CENTER_NAME } from './path.js';
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';
import { warn } from './logger.js';

/**
 * 交互式输入项目名
 * @returns {Promise<string>}
 */
export async function promptName() {
  return input({
    message: 'Project name:',
    validate: (value) => {
      const result = validateProjectName(value.trim());
      if (result !== true) return result;
      return true;
    },
  });
}

/**
 * 交互式输入 workspace 目录
 * @param {string} defaultDir - 默认目录
 * @returns {Promise<string>}
 */
export async function promptDir(defaultDir) {
  const answer = await input({
    message: `Workspace directory:`,
    default: defaultDir,
  });
  return answer;
}

/**
 * 交互式选择模块（用于 init 命令）
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: boolean}>>}
 */
export async function promptModules() {
  const available = getAvailableTemplateNames();
  const choices = [
    ...available.map(name => ({
      name: name === SPEC_CENTER_NAME ? `${name} (required)` : name,
      value: name,
      disabled: name === SPEC_CENTER_NAME,
    })),
    { name: '+ Custom module...', value: '__custom__' },
  ];

  const selected = await checkbox({
    message: 'Select modules:',
    choices,
    required: true,
    initialValues: [SPEC_CENTER_NAME],
  });

  const modules = [];
  for (const sel of selected) {
    if (sel === '__custom__') {
      const customModules = await promptCustomModule();
      modules.push(...customModules);
    } else {
      modules.push({ name: sel, templateRef: sel, isCustom: false });
    }
  }

  return modules;
}

/**
 * 交互式选择要添加的模块（用于 add 命令）
 * @param {string[]} available - 可添加的模块名列表
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: boolean}>>}
 */
export async function promptAddModules(available) {
  const choices = [
    ...available.map(name => ({ name, value: name })),
    { name: '+ Custom module...', value: '__custom__' },
  ];

  const selected = await checkbox({
    message: 'Select modules to add:',
    choices,
  });

  const modules = [];
  for (const sel of selected) {
    if (sel === '__custom__') {
      const customModules = await promptCustomModule();
      modules.push(...customModules);
    } else {
      modules.push({ name: sel, templateRef: sel, isCustom: false });
    }
  }

  return modules;
}

/**
 * 交互式输入自定义模块信息
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: boolean}>>}
 */
export async function promptCustomModule() {
  const customs = [];
  let addAnother = true;

  while (addAnother) {
    const name = await input({
      message: 'Custom module name:',
      validate: (value) => {
        const result = validateProjectName(value.trim());
        if (result !== true) return result;
        return true;
      },
    });

    const templates = getAvailableTemplateNames().filter(t => t !== SPEC_CENTER_NAME);
    const templateRef = await select({
      message: 'Reference template:',
      choices: templates.map(t => ({ name: t, value: t })),
    });

    customs.push({ name: name.trim(), templateRef, isCustom: true });

    const more = await confirm({ message: 'Add another custom module?', default: false });
    addAnother = more;
  }

  return customs;
}

/**
 * 解析逗号分隔的模块列表字符串
 * @param {string} moduleStr - 逗号分隔的模块名
 * @returns {Array<{name: string, templateRef: string, isCustom: boolean}>}
 */
export function parseModuleList(moduleStr) {
  return moduleStr.split(',')
    .map(s => s.trim())
    .filter(name => {
      if (!name) {
        warn('Empty module name in list, skipping');
        return false;
      }
      return true;
    })
    .map(name => ({ name, templateRef: name, isCustom: false }));
}