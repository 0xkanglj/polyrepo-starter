#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { setGlobalTemplatesDir } from './utils/path.js';
import { setVerbose } from './utils/logger.js';
import { CommandError } from './utils/errors.js';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

function warnIfTraversalPath(p, flagName) {
  if (p.includes('..')) {
    console.warn(`[WARN] ${flagName} contains ".." — resolved to: ${resolve(p)}`);
  }
}

program
  .name('scaffold')
  .description('Multi-repo workspace scaffold tool')
  .version(pkg.version)
  .option('--verbose', 'Enable debug output');

program
  .command('init')
  .description('Create a new workspace')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --dir <path>', 'Workspace directory')
  .option('-m, --modules <list>', 'Comma-separated modules')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (program.opts().verbose) setVerbose(true);
    if (options.templatesDir) {
      warnIfTraversalPath(options.templatesDir, '--templates-dir');
      setGlobalTemplatesDir(options.templatesDir);
    }
    if (options.dir) {
      warnIfTraversalPath(options.dir, '--dir');
    }
    await initCommand(options);
  });

program
  .command('add')
  .description('Add modules to existing workspace')
  .option('-m, --modules <list>', 'Comma-separated modules to add')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (program.opts().verbose) setVerbose(true);
    if (options.templatesDir) {
      warnIfTraversalPath(options.templatesDir, '--templates-dir');
      setGlobalTemplatesDir(options.templatesDir);
    }
    await addCommand(options);
  });

program.exitOverride();

process.on('unhandledRejection', (err) => {
  if (err.name === 'ExitPromptError') {
    console.log('\nAborted.');
    process.exit(0);
  }
  if (err instanceof CommandError) {
    console.error(`\n[ERROR] ${err.message}`);
    process.exit(1);
  }
  console.error('\nUnexpected error:', err.message);
  process.exit(1);
});

program.parse();
