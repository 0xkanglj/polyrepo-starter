import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getModuleRole } from './templates.js';
import { resolveTemplatesDir } from '../utils/path.js';

const MODULE_MARKER = /<!-- MODULE:([a-z0-9-]+) -->/;
const BEGIN_MARKER = /<!-- BEGIN MODULE:([a-z0-9-]+) -->/;
const END_MARKER = /<!-- END MODULE:([a-z0-9-]+) -->/;

export function filterAgentsMd(templateContent, selectedModules) {
  const lines = templateContent.split('\n');
  const result = [];
  let skipMode = null;

  for (const line of lines) {
    const beginMatch = line.match(BEGIN_MARKER);
    const endMatch = line.match(END_MARKER);

    if (beginMatch) {
      if (!selectedModules.includes(beginMatch[1])) {
        skipMode = beginMatch[1];
      } else {
        const remainder = line.replace(/<!-- BEGIN MODULE:[a-z0-9-]+ -->\s?/, '');
        if (remainder) result.push(remainder);
      }
      continue;
    }

    if (endMatch) {
      if (skipMode === endMatch[1]) {
        skipMode = null;
      }
      const remainder = line.replace(/<!-- END MODULE:[a-z0-9-]+ -->\s?/, '');
      if (remainder) result.push(remainder);
      continue;
    }

    if (skipMode) continue;

    const singleMatch = line.match(MODULE_MARKER);
    if (singleMatch) {
      if (!selectedModules.includes(singleMatch[1])) {
        continue;
      }
      result.push(line.replace(/<!-- MODULE:[a-z0-9-]+ -->\s?/, ''));
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

export function syncAgentsMd(workspaceDir, projectName, modules) {
  const srcPath = resolveTemplatesDir('spec-center', 'AGENTS.md');
  const templateContent = readFileSync(srcPath, 'utf-8');
  const selectedModuleNames = modules.map(m => m.name);
  const filtered = filterAgentsMd(templateContent, selectedModuleNames);
  const destPath = join(workspaceDir, `${projectName}-spec-center`, 'AGENTS.md');
  writeFileSync(destPath, filtered, 'utf-8');
}

export function mergeAgentsMd(workspaceDir, projectName, newModules) {
  const agentsPath = join(workspaceDir, `${projectName}-spec-center`, 'AGENTS.md');
  let content = readFileSync(agentsPath, 'utf-8');

  for (const mod of newModules) {
    const role = getModuleRole(mod.templateRef);
    const tableRow = `| \`${mod.name}\` | ${role} |`;
    content = insertIntoModuleMap(content, tableRow, mod.name);

    const treeEntry = buildModuleTreeEntry(projectName, mod.name);
    content = insertIntoRepoTree(content, treeEntry);
  }

  writeFileSync(agentsPath, content, 'utf-8');
}

function insertIntoModuleMap(content, newRow, moduleName) {
  const lines = content.split('\n');
  let tableStart = -1;
  let separatorIdx = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('| Module |') && lines[i].includes('Role')) {
      tableStart = i;
    }
    if (tableStart !== -1 && separatorIdx === -1 && lines[i].match(/^\|---/)) {
      separatorIdx = i;
    }
    if (separatorIdx !== -1 && tableEnd === -1) {
      if (!lines[i].match(/^\| .* \| .* \|/)) {
        tableEnd = i - 1;
        break;
      }
    }
  }
  if (tableEnd === -1 && separatorIdx !== -1) {
    tableEnd = lines.length - 1;
  }
  if (tableStart === -1 || separatorIdx === -1) return content;

  const dataRows = lines.slice(separatorIdx + 1, tableEnd + 1);
  dataRows.push(newRow);

  dataRows.sort((a, b) => {
    const nameA = a.match(/`([^`]+)`/)?.[1] || '';
    const nameB = b.match(/`([^`]+)`/)?.[1] || '';
    return nameA.localeCompare(nameB);
  });

  lines.splice(separatorIdx + 1, tableEnd - separatorIdx, ...dataRows);
  return lines.join('\n');
}

function insertIntoRepoTree(content, treeEntry) {
  const lastCodeBlock = content.lastIndexOf('```');
  if (lastCodeBlock === -1) return content;

  const before = content.substring(0, lastCodeBlock);
  const after = content.substring(lastCodeBlock);
  return before + treeEntry + '\n' + after;
}

function buildModuleTreeEntry(projectName, moduleName) {
  const dirName = `${projectName}-${moduleName}`;
  return `├── ${dirName}/\n│   ├── AGENTS.md\n│   └── docs/\n│       ├── specs/\n│       └── plans/`;
}
