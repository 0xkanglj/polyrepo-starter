import path from 'path';
import ora from 'ora';
import { expandHome, validateProjectName } from '../utils/path.js';
import { promptName, promptDir, promptModules, parseModuleList } from '../utils/prompt.js';
import { copyAndReplace, gitInit, mkdirIfNeeded } from '../core/scaffold.js';
import { syncAgentsMd } from '../core/agents-sync.js';
import { printDryRun, printSummary, error as logError, info } from '../utils/logger.js';

/**
 * init 子命令：创建新 workspace
 * @param {object} options - Commander 解析的选项
 */
export async function initCommand(options) {
  try {
    const cwd = process.cwd();

    // 1. 项目名
    const name = options.name || await promptName();
    const validation = validateProjectName(name);
    if (validation !== true) {
      logError(`Invalid project name: ${validation}`);
      process.exit(1);
    }

    // 2. Workspace 路径
    const defaultDir = path.join(cwd, name);
    let workspaceDir;
    if (options.dir) {
      workspaceDir = expandHome(options.dir);
    } else {
      const dirInput = await promptDir(defaultDir);
      workspaceDir = expandHome(dirInput);
    }

    // 3. 模块选择
    let modules;
    if (options.modules) {
      modules = parseModuleList(options.modules);
    } else {
      modules = await promptModules();
    }

    // spec-center 强制包含
    if (!modules.find(m => m.name === 'spec-center')) {
      modules.unshift({ name: 'spec-center', templateRef: 'spec-center', isCustom: false });
    }

    // 4. Dry run
    if (options.dryRun) {
      printDryRun(workspaceDir, name, modules);
      return;
    }

    // 5. 创建 workspace
    mkdirIfNeeded(workspaceDir);

    // 复制 root 模板
    const rootSpinner = ora('Creating workspace root...').start();
    copyAndReplace('root', workspaceDir, { PROJECT: name });
    rootSpinner.succeed('Workspace root created');

    // 初始化各模块
    for (const mod of modules) {
      const modDir = path.join(workspaceDir, `${name}-${mod.name}`);
      const spinner = ora(`Creating ${name}-${mod.name}...`).start();
      copyAndReplace(mod.templateRef, modDir, {
        PROJECT: name,
        MODULE_NAME: mod.isCustom ? mod.name : null,
        TEMPLATE_REF: mod.isCustom ? mod.templateRef : null,
      });
      gitInit(modDir, mod.name);
      spinner.succeed(`Created ${name}-${mod.name}`);
    }

    // 生成 spec-center AGENTS.md
    syncAgentsMd(workspaceDir, name, modules);
    printSummary(workspaceDir, name, modules);
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    throw err;
  }
}
