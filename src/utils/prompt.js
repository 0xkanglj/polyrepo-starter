import { input, select } from '@inquirer/prompts';
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

export function parseModuleList(moduleStr, takenNames = []) {
  const templates = getAvailableTemplateNames();
  const results = [];
  const entries = moduleStr.split(',').map(s => s.trim()).filter(Boolean);

  for (const entry of entries) {
    const eqIdx = entry.indexOf('=');
    let name, templateName;
    if (eqIdx >= 0) {
      name = entry.slice(0, eqIdx).trim();
      templateName = entry.slice(eqIdx + 1).trim();
    } else {
      name = entry;
      templateName = entry;
    }

    if (!name) { warn(`Empty name in "${entry}" — skipping`); continue; }
    const nameValidation = validateProjectName(name);
    if (nameValidation !== true) { warn(`Invalid name "${name}": ${nameValidation} — skipping`); continue; }
    if (!templates.includes(templateName) || templateName === 'root') { warn(`Template "${templateName}" not available — skipping "${entry}"`); continue; }
    if (takenNames.includes(name)) { warn(`Module "${name}" already exists — skipping "${entry}"`); continue; }

    results.push({ name, templateRef: templateName, isCustom: name !== templateName });
    takenNames.push(name);
  }
  return results;
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
