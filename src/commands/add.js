import path from 'path';
import fs from 'fs';
import ora from 'ora';
import {
  expandHome,
  validateProjectName,
  extractProjectName,
} from '../utils/path.js';
import { promptAddModules, parseModuleList } from '../utils/prompt.js';
import { copyAndReplace, gitInit } from '../core/scaffold.js';
import { mergeAgentsMd } from '../core/agents-sync.js';
import { getAvailableTemplateNames, validateTemplate } from '../core/templates.js';
import {
  error as logError,
  info,
  warn,
  success,
  printSummary,
} from '../utils/logger.js';

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
            name.endsWith('-spec-center') &&
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
      logError(
        'Not in a workspace directory. No *-spec-center/ found in current or parent directories.'
      );
      info('Usage: cd <workspace-dir> && node src/cli.js add');
      process.exit(1);
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
        toAdd = [];
      } else {
        toAdd = await promptAddModules(available);
      }
    }

    // 处理 -c 参数的自定义模块
    if (options.custom) {
      const customs = Array.isArray(options.custom)
        ? options.custom
        : [options.custom];
      for (const c of customs) {
        const [name, ref] = c.split(':');
        if (!name || !ref) {
          logError(`Invalid custom module format: "${c}". Use name:ref (e.g. crawler:server)`);
          process.exit(1);
        }
        const nameValidation = validateProjectName(name);
        if (nameValidation !== true) {
          logError(`Invalid custom module name "${name}": ${nameValidation}`);
          process.exit(1);
        }
        try {
          validateTemplate(ref);
        } catch {
          logError(`Reference template not found: "${ref}". Available: ${allTemplateNames.join(', ')}`);
          process.exit(1);
        }
        toAdd.push({ name, templateRef: ref, isCustom: true });
      }
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
        const suffix = mod.isCustom ? ` (based on ${mod.templateRef})` : '';
        console.log(`  Would create: ${projectName}-${mod.name}/${suffix}`);
      }
      return;
    }

    // 5. 创建新模块
    for (const mod of filtered) {
      const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
      const spinner = ora(`Creating ${projectName}-${mod.name}...`).start();
      copyAndReplace(mod.templateRef, modDir, {
        PROJECT: projectName,
        MODULE_NAME: mod.isCustom ? mod.name : null,
        TEMPLATE_REF: mod.isCustom ? mod.templateRef : null,
      });
      gitInit(modDir, mod.name);
      spinner.succeed(`Created ${projectName}-${mod.name}`);
    }

    // 6. 增量 merge AGENTS.md
    mergeAgentsMd(workspaceDir, projectName, filtered);

    printSummary(workspaceDir, projectName, filtered, 'added');
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    throw err;
  }
}
