import path from 'path';
import ora from 'ora';
import { expandHome, validateProjectName, SPEC_CENTER_NAME } from '../utils/path.js';
import { promptName, promptDir, promptModules, parseModuleList } from '../utils/prompt.js';
import { copyAndReplace, mkdirIfNeeded, createModule } from '../core/scaffold.js';
import { syncAgentsMd } from '../core/agents-sync.js';
import { printDryRun, printSummary, info } from '../utils/logger.js';
import { CommandError } from '../utils/errors.js';

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
      throw new CommandError(`Invalid project name: ${validation}`);
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
    if (!modules.find(m => m.name === SPEC_CENTER_NAME)) {
      modules.unshift({ name: SPEC_CENTER_NAME, templateRef: SPEC_CENTER_NAME, isCustom: false });
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
    try {
      copyAndReplace('root', workspaceDir, { PROJECT: name });
      rootSpinner.succeed('Workspace root created');
    } catch (err) {
      rootSpinner.fail('Failed to create workspace root');
      throw err;
    }

    // 初始化各模块
    for (const mod of modules) {
      const modDir = path.join(workspaceDir, `${name}-${mod.name}`);
      createModule(mod.templateRef, modDir, name, mod);
    }

    // 生成 spec-center AGENTS.md
    syncAgentsMd(workspaceDir, name, modules);
    printSummary(workspaceDir, name, modules);
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    if (err instanceof CommandError) throw err;
    throw new CommandError(`init failed: ${err.message}`);
  }
}
