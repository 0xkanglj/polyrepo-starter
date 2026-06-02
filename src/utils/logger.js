import chalk from 'chalk';

let verbose = false;

export function setVerbose(value) {
  verbose = value;
}

export function debug(message) {
  if (verbose) {
    console.log(chalk.gray(`[DEBUG] ${message}`));
  }
}

export function info(message) {
  console.log(chalk.cyan(`[INFO] ${message}`));
}

export function warn(message) {
  console.log(chalk.yellow(`[WARN] ${message}`));
}

export function error(message) {
  console.error(chalk.red(`[ERROR] ${message}`));
}

export function success(message) {
  console.log(chalk.green(`[OK] ${message}`));
}

export function moduleLabel(projectName, mod) {
  const suffix = mod.isCustom ? ` (based on ${mod.templateRef})` : '';
  return `${projectName}-${mod.name}${suffix}`;
}

export function printDryRun(workspaceDir, projectName, modules) {
  console.log('');
  info('=== DRY RUN — nothing will be written ===');
  console.log('');
  console.log(`Workspace   : ${workspaceDir}`);
  console.log(`Project     : ${projectName}`);
  console.log(`Modules     : ${modules.map(m => m.name).join(', ')}`);
  console.log('');
  console.log('Would create:');
  console.log(`  ${workspaceDir}/`);
  console.log(`  ${workspaceDir}/AGENTS.md`);
  console.log(`  ${workspaceDir}/CLAUDE.md`);
  console.log(`  ${workspaceDir}/.claude/`);
  console.log(`  ${workspaceDir}/.opencode/`);
  for (const mod of modules) {
    console.log(`  ${workspaceDir}/${moduleLabel(projectName, mod)}/`);
  }
  console.log('');
  info('=== END DRY RUN ===');
}

export function printSummary(workspaceDir, projectName, modules, action = 'created') {
  console.log('');
  console.log('==========================================');
  success(`Workspace ${action} successfully!`);
  console.log('==========================================');
  console.log('');
  console.log(`  Location : ${workspaceDir}`);
  console.log(`  Project  : ${projectName}`);
  console.log(`  Modules  :`);
  for (const mod of modules) {
    console.log(`              ${moduleLabel(projectName, mod)}/`);
  }
  console.log('');
  if (action === 'created') {
    info('Next steps:');
    console.log(`  1. cd ${workspaceDir}`);
    console.log('  2. Review and customize each module\'s AGENTS.md');
    console.log('  3. Define tech stack and build commands per module');
  }
  console.log('');
}