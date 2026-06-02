#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { setGlobalTemplatesDir } from './utils/path.js';

program
  .name('scaffold')
  .description('Multi-repo workspace scaffold tool')
  .version('1.0.0');

program
  .command('init')
  .description('Create a new workspace')
  .option('-n, --name <name>', 'Project name')
  .option('-d, --dir <path>', 'Workspace directory')
  .option('-m, --modules <list>', 'Comma-separated modules')
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (options.templatesDir) {
      setGlobalTemplatesDir(options.templatesDir);
    }
    await initCommand(options);
  });

program
  .command('add')
  .description('Add modules to existing workspace')
  .option('-m, --modules <list>', 'Comma-separated modules to add')
  .option('-c, --custom <name:ref>', 'Add custom module', (value, previous) => {
    return previous ? [...previous, value] : [value];
  })
  .option('--templates-dir <path>', 'Override templates directory')
  .option('--dry-run', 'Show what would be created')
  .action(async (options) => {
    if (options.templatesDir) {
      setGlobalTemplatesDir(options.templatesDir);
    }
    await addCommand(options);
  });

program.parse();