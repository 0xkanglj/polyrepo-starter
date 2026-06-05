#!/usr/bin/env node

import { program } from 'commander';
import { scaffoldCommand } from './commands/scaffold.js';
import { setVerbose } from './utils/logger.js';
import { CommandError } from './utils/errors.js';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';

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
  .option('--verbose', 'Enable debug output')
  .option('-n, --name <name>', 'Project name (init mode)')
  .option('-d, --dir <path>', 'Workspace directory (init mode)')
  .option('-m, --modules <list>', 'Modules: "name" or "name=template", comma-separated')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (program.opts().verbose) setVerbose(true);
    if (options.dir) warnIfTraversalPath(options.dir, '--dir');
    await scaffoldCommand(options);
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
