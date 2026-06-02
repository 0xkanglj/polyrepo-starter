import path from 'path';
import fs from 'fs';
import {
  expandHome,
  validateProjectName,
  extractProjectName,
  SPEC_CENTER_SUFFIX,
  SPEC_CENTER_NAME,
} from '../utils/path.js';
import { promptAddModules, parseModuleList, promptCustomModule } from '../utils/prompt.js';
import { createModule } from '../core/scaffold.js';
import { mergeAgentsMd } from '../core/agents-sync.js';
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';
import { confirm } from '@inquirer/prompts';
import {
  info,
  warn,
  printSummary,
  moduleLabel,
} from '../utils/logger.js';
import { CommandError } from '../utils/errors.js';

/**
 * 向上遍历父目录，查找 *-spec-center/ 目录
 * @param {string} startDir - 起始目录
 * @returns {string|null} spec-center 目录的完整路径
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
 * 扫描 workspace 中已有的模块
 * @param {string} workspaceDir - workspace 目录
 * @param {string} projectName - 项目名
 * @returns {string[]} 已有模块名列表
 */
export function scanExistingModules(workspaceDir, projectName) {
  const prefix = `${projectName}-`;
  return fs
    .readdirSync(workspaceDir)
    .filter((name) => name.startsWith(prefix) && fs.statSync(path.join(workspaceDir, name)).isDirectory())
    .map((name) => name.slice(prefix.length));
}

/**
 * 解析 -c 参数的自定义模块
 */
function parseCustomModules(customArgs, allTemplateNames) {
  const customs = Array.isArray(customArgs) ? customArgs : [customArgs];
  const modules = [];
  for (const c of customs) {
    const [name, ref] = c.split(':');
    if (!name || !ref) {
      throw new CommandError(`Invalid custom module format: "${c}". Use name:ref (e.g. crawler:server)`);
    }
    const nameValidation = validateProjectName(name);
    if (nameValidation !== true) {
      throw new CommandError(`Invalid custom module name "${name}": ${nameValidation}`);
    }
    try {
      validateTemplate(ref);
    } catch {
      throw new CommandError(`Reference template not found: "${ref}". Available: ${allTemplateNames.join(', ')}`);
    }
    modules.push({ name, templateRef: ref, isCustom: true });
  }
  return modules;
}

/**
 * add 子命令：追加模块到已有 workspace
 * @param {object} options - Commander 解析的选项
 */
export async function addCommand(options) {
  try {
    const cwd = process.cwd();

    // 1. 检测 workspace
    const specCenterDir = findSpecCenter(cwd);
    if (!specCenterDir) {
      throw new CommandError(
        'Not in a workspace directory. No *-spec-center/ found in current or parent directories.'
      );
    }

    const workspaceDir = path.dirname(specCenterDir);
    const projectName = extractProjectName(specCenterDir);
    const existingModules = scanExistingModules(workspaceDir, projectName);

    info(`Detected workspace: ${workspaceDir}`);
    info(`Detected project:   ${projectName}`);
    info(`Existing modules:   ${existingModules.join(', ')}`);

    const allTemplateNames = getAvailableTemplateNames();
    const available = allTemplateNames.filter(
      (m) => !existingModules.includes(m)
    );

    // 2. 收集要添加的模块
    let toAdd;
    if (options.modules) {
      toAdd = parseModuleList(options.modules);
    } else if (options.custom) {
      toAdd = [];
    } else {
      if (available.length === 0) {
        info('All standard modules are already installed.');
        const addCustom = await confirm({ message: 'Add a custom module?', default: true });
        if (addCustom) {
          const customs = await promptCustomModule();
          toAdd = customs;
        } else {
          toAdd = [];
        }
      } else {
        toAdd = await promptAddModules(available);
      }
    }

    if (options.custom) {
      toAdd.push(...parseCustomModules(options.custom, allTemplateNames));
    }

    // 3. 跳过已存在的模块
    const filtered = toAdd.filter((m) => {
      if (existingModules.includes(m.name)) {
        warn(`Module "${m.name}" already exists. Skipping.`);
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      info('All specified modules already exist. Nothing to add.');
      return;
    }

    // 4. Dry run
    if (options.dryRun) {
      for (const mod of filtered) {
        console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
      }
      return;
    }

    // 5. 创建新模块
    for (const mod of filtered) {
      const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
      createModule(mod.templateRef, modDir, projectName, mod);
    }

    // 6. 增量 merge AGENTS.md
    mergeAgentsMd(workspaceDir, projectName, filtered);

    printSummary(workspaceDir, projectName, filtered, 'added');
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    if (err instanceof CommandError) throw err;
    throw new CommandError(`add failed: ${err.message}`);
  }
}
