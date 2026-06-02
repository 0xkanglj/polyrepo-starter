import { input, checkbox, confirm, select } from '@inquirer/prompts';
import { validateProjectName, SPEC_CENTER_NAME } from './path.js';
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';
import { warn } from './logger.js';
import { CommandError } from './errors.js';

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
 * 展示 templates/ 下除 spec-center 外的所有模块，不含 custom 选项
 * @returns {Promise<Array<{name: string, templateRef: string, isCustom: false}>>}
 */
export async function promptModules() {
  const available = getAvailableTemplateNames().filter(
    (name) => name !== SPEC_CENTER_NAME
  );

  const selected = await checkbox({
    message: 'Select modules:',
    choices: available.map((name) => ({ name, value: name })),
    required: false,
  });

  return selected.map((name) => ({ name, templateRef: name, isCustom: false }));
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

/**
 * 交互式单选一个模块（用于 add 命令）
 * 展示所有模板（排除 spec-center），不区分已存在与否
 * @param {string[]} existingModules - 已有模块名列表（预留，暂不使用）
 * @returns {Promise<{templateName: string}>}
 */
export async function promptAddOneModule(existingModules) {
  const templates = getAvailableTemplateNames().filter(
    (t) => t !== SPEC_CENTER_NAME
  );

  if (templates.length === 0) {
    throw new CommandError('No modules available to add.');
  }

  const templateName = await select({
    message: 'Select a module to add:',
    choices: templates.map((t) => ({ name: t, value: t })),
  });

  return { templateName };
}

/**
 * 交互式确认/输入模块名，含合法性+唯一性校验循环
 * @param {string} templateName - 选中的模板名
 * @param {string[]} existingModules - workspace 中已有模块名
 * @param {string[]} sessionAdded - 本次会话已添加的模块名
 * @returns {Promise<{name: string, templateRef: string, isCustom: boolean}>}
 */
export async function promptModuleName(templateName, existingModules, sessionAdded) {
  const allTaken = [...existingModules, ...sessionAdded];
  const templateNameTaken = existingModules.includes(templateName);

  // Determine default value and warning hint
  const hasDefault = !templateNameTaken;
  let hintMessage = '';
  if (templateNameTaken) {
    hintMessage = `⚠ Module "${templateName}" already exists — please enter a different name`;
  }

  // Validation function
  function validateModuleName(value) {
    const name = value.trim();

    // Non-empty
    if (!name) {
      return 'Module name cannot be empty';
    }

    // Regex check: same rules as project name
    const regexResult = validateProjectName(name);
    if (regexResult !== true) {
      return regexResult;
    }

    // Uniqueness against workspace + session
    if (allTaken.includes(name)) {
      return `Module name "${name}" is already taken`;
    }

    return true;
  }

  // Prompt loop: if validation fails, re-prompt
  const name = await input({
    message: hintMessage
      ? `${hintMessage}\n  Module name:`
      : 'Module name:',
    default: hasDefault ? templateName : undefined,
    validate: validateModuleName,
  });

  const trimmedName = name.trim();
  return {
    name: trimmedName,
    templateRef: templateName,
    isCustom: trimmedName !== templateName,
  };
}