import path from 'path';
import ora from 'ora';
import { SPEC_CENTER_NAME } from '../utils/path.js';
import { CommandError } from '../utils/errors.js';
import { detectMode } from '../steps/detect-mode.js';
import { resolveName } from '../steps/resolve-name.js';
import { resolveDir } from '../steps/resolve-dir.js';
import { moduleLoop } from '../steps/module-loop.js';
import { reviewTable } from '../steps/review-table.js';
import { copyAndReplace, mkdirIfNeeded, createModule } from '../core/scaffold.js';
import { syncAgentsMd, mergeAgentsMd } from '../core/agents-sync.js';
import {
  info,
  warn,
  printDryRun,
  printSummary,
  moduleLabel,
} from '../utils/logger.js';

/**
 * Unified scaffold command — replaces both init and add subcommands.
 * Auto-detects mode based on context:
 *   - If --name given or no spec-center found → init mode
 *   - If spec-center found in cwd or parents → add mode
 * @param {object} options - CLI options
 */
export async function scaffoldCommand(options) {
  try {
    const cwd = process.cwd();

    // 1. Detect mode
    const { mode, ctx } = detectMode(cwd, options);

    let projectName;
    let workspaceDir;
    let modules = [];

    if (mode === 'init') {
      // 2a. Init mode: resolve name and dir
      projectName = await resolveName(options);
      workspaceDir = await resolveDir(cwd, projectName, options);

      // spec-center is always included
      modules.push({ name: SPEC_CENTER_NAME, templateRef: SPEC_CENTER_NAME, isCustom: false });
    } else {
      // 2b. Add mode: use detected context
      if (options.dir) {
        warn('--dir is ignored in add mode (workspace already exists)');
      }
      projectName = ctx.projectName;
      workspaceDir = ctx.workspaceDir;

      info(`Detected workspace: ${workspaceDir}`);
      info(`Detected project:   ${projectName}`);
      info(`Existing modules:   ${ctx.existingModules.join(', ')}`);
    }

    // 3. Module loop — collect modules
    modules = await moduleLoop(ctx, options, modules);

    // 4. In add mode, filter out spec-center and already-existing modules
    if (mode === 'add') {
      modules = modules.filter(m => {
        if (m.name === SPEC_CENTER_NAME) {
          info('spec-center already exists — skipping.');
          return false;
        }
        if (ctx.existingModules.includes(m.name)) {
          warn(`Module "${m.name}" already exists. Skipping.`);
          return false;
        }
        return true;
      });
    }

    // 5. Review table
    modules = await reviewTable(ctx, options, modules);

    // 6. Dry run
    if (options.dryRun) {
      if (mode === 'init') {
        printDryRun(workspaceDir, projectName, modules);
      } else {
        for (const mod of modules) {
          console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
        }
      }
      return;
    }

    // 7. Create workspace (init mode only)
    if (mode === 'init') {
      mkdirIfNeeded(workspaceDir);

      // Copy root template
      const rootSpinner = ora('Creating workspace root...').start();
      try {
        copyAndReplace('root', workspaceDir, { PROJECT: projectName });
        rootSpinner.succeed('Workspace root created');
      } catch (err) {
        rootSpinner.fail('Failed to create workspace root');
        throw err;
      }
    }

    // 8. Create each module
    for (const mod of modules) {
      const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
      createModule(mod.templateRef, modDir, projectName, mod);
    }

    // 9. Sync AGENTS.md
    if (mode === 'init') {
      syncAgentsMd(workspaceDir, projectName, modules);
    } else {
      if (modules.length > 0) {
        mergeAgentsMd(workspaceDir, projectName, modules);
      }
    }

    // 10. Print summary
    printSummary(workspaceDir, projectName, modules, mode === 'init' ? 'created' : 'added');
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      info('Aborted.');
      return;
    }
    if (err instanceof CommandError) throw err;
    throw new CommandError(`scaffold failed: ${err.message}`);
  }
}
