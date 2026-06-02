import path from 'path';
import fs from 'fs';
import {
  extractProjectName,
  SPEC_CENTER_SUFFIX,
  SPEC_CENTER_NAME,
} from '../utils/path.js';
import { parseModuleList, promptAddOneModule, promptModuleName } from '../utils/prompt.js';
import { createModule } from '../core/scaffold.js';
import { mergeAgentsMd } from '../core/agents-sync.js';
import { getAvailableTemplateNames } from '../core/templates.js';
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

    // Check if templates are available
    const templates = getAvailableTemplateNames().filter(
      (t) => t !== SPEC_CENTER_NAME
    );
    if (templates.length === 0) {
      info('No modules available to add.');
      return;
    }

    // 2. --modules: 批量模式，跳过交互循环
    if (options.modules) {
      const toAdd = parseModuleList(options.modules);
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

      if (options.dryRun) {
        for (const mod of filtered) {
          console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
        }
        return;
      }

      for (const mod of filtered) {
        const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
        createModule(mod.templateRef, modDir, projectName, mod);
      }

      if (filtered.length > 0) mergeAgentsMd(workspaceDir, projectName, filtered);
      printSummary(workspaceDir, projectName, filtered, 'added');
      return;
    }

    // 3. Interactive single-select loop
    const addedModules = [];

    while (true) {
      const { templateName } = await promptAddOneModule(existingModules);

      const mod = await promptModuleName(
        templateName,
        existingModules,
        addedModules.map((m) => m.name),
      );

      if (options.dryRun) {
        console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
      } else {
        const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
        createModule(mod.templateRef, modDir, projectName, mod);
      }

      addedModules.push(mod);
      existingModules.push(mod.name);

      const more = await confirm({
        message: '继续添加下一个模块？',
        default: false,
      });
      if (!more) break;
    }

    if (!options.dryRun && addedModules.length > 0) {
      mergeAgentsMd(workspaceDir, projectName, addedModules);
    }

    printSummary(workspaceDir, projectName, addedModules, 'added');
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      // TODO: list already-created modules — not rolling back
      return;
    }
    if (err instanceof CommandError) throw err;
    throw new CommandError(`add failed: ${err.message}`);
  }
}
