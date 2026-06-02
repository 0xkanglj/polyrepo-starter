import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { globSync } from 'glob';
import { execSync, execFileSync } from 'child_process';
import ora from 'ora';
import { resolveTemplatesDir } from '../utils/path.js';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const TEXT_FILE_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.toml',
  '.js', '.ts', '.jsx', '.tsx', '.go', '.py', '.rb',
  '.sh', '.bash', '.zsh', '.gitignore', '.cursorignore',
  '.env', '.env.example', '.gitkeep', '.mdc',
]);

function isTextFile(filePath) {
  const base = basename(filePath);
  if (base === 'Makefile' || base === 'Dockerfile') return true;
  const ext = extname(filePath);
  return TEXT_FILE_EXTENSIONS.has(ext) || ext === '';
}

export function mkdirIfNeeded(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

export function copyAndReplace(templateName, targetDir, vars) {
  if (!vars || !vars.PROJECT) {
    throw new Error('copyAndReplace requires vars.PROJECT to be set');
  }
  const srcDir = resolveTemplatesDir(templateName);
  if (!existsSync(srcDir)) {
    throw new Error(`Template not found: "${templateName}" (looked in ${srcDir})`);
  }
  cpSync(srcDir, targetDir, { recursive: true });

  const files = globSync('**/*', { cwd: targetDir, nodir: true, dot: true });
  for (const file of files) {
    const filePath = join(targetDir, file);
    if (!isTextFile(filePath)) continue;

    let content = readFileSync(filePath, 'utf-8');
    content = content.replace(/\{\{PROJECT\}\}/g, vars.PROJECT);

    if (vars.MODULE_NAME && vars.TEMPLATE_REF) {
      content = content.replace(
        new RegExp(`-${escapeRegExp(vars.TEMPLATE_REF)}\\b`, 'g'),
        `-${vars.MODULE_NAME}`
      );
    }

    writeFileSync(filePath, content, 'utf-8');
  }
}

export function gitInit(modDir, moduleName) {
  try {
    execSync('git init', { cwd: modDir, stdio: 'pipe' });
    execSync('git branch -M main', { cwd: modDir, stdio: 'pipe' });
    execSync('git add .', { cwd: modDir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', `chore: initialize ${moduleName} from scaffold`], {
      cwd: modDir,
      stdio: 'pipe',
    });
  } catch (err) {
    throw new Error(`Failed to initialize git repo for "${moduleName}": ${err.message}`);
  }
}

export function createModule(templateRef, modDir, projectName, mod) {
  const label = `${projectName}-${mod.name}`;
  const spinner = ora(`Creating ${label}...`).start();
  try {
    copyAndReplace(templateRef, modDir, {
      PROJECT: projectName,
      MODULE_NAME: mod.isCustom ? mod.name : null,
      TEMPLATE_REF: mod.isCustom ? mod.templateRef : null,
    });
    gitInit(modDir, mod.name);
    spinner.succeed(`Created ${label}`);
  } catch (err) {
    spinner.fail(`Failed to create ${label}`);
    throw err;
  }
}
