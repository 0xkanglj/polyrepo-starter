import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { globSync } from 'glob';
import { execSync } from 'child_process';
import { resolveTemplatesDir } from '../utils/path.js';

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
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

export function copyAndReplace(templateName, targetDir, vars) {
  const srcDir = resolveTemplatesDir(templateName);
  cpSync(srcDir, targetDir, { recursive: true });

  const files = globSync('**/*', { cwd: targetDir, nodir: true, dot: true });
  for (const file of files) {
    const filePath = join(targetDir, file);
    if (!isTextFile(filePath)) continue;

    let content = readFileSync(filePath, 'utf-8');
    content = content.replace(/\{\{PROJECT\}\}/g, vars.PROJECT);

    if (vars.MODULE_NAME && vars.TEMPLATE_REF) {
      content = content.replace(
        new RegExp(`-${vars.TEMPLATE_REF}\\b`, 'g'),
        `-${vars.MODULE_NAME}`
      );
    }

    writeFileSync(filePath, content, 'utf-8');
  }
}

export function gitInit(modDir, moduleName) {
  execSync('git init', { cwd: modDir, stdio: 'pipe' });
  execSync('git branch -M main', { cwd: modDir, stdio: 'pipe' });
  execSync('git add .', { cwd: modDir, stdio: 'pipe' });
  execSync(`git commit -m "chore: initialize ${moduleName} from scaffold"`, {
    cwd: modDir,
    stdio: 'pipe',
  });
}
