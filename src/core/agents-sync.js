import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getModuleRole } from './templates.js';
import { resolveTemplatesDir, SPEC_CENTER_SUFFIX } from '../utils/path.js';

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

  // Built-in modules use template markers; custom modules do not.
  // For custom modules, include the reference template's marker so its
  // content is preserved, then merge custom entries on top.
  const builtInNames = modules
    .filter(m => !m.isCustom)
    .map(m => m.name);
  const customRefs = modules
    .filter(m => m.isCustom)
    .map(m => m.templateRef);
  const filterNames = [...new Set([...builtInNames, ...customRefs])];

  const filtered = filterAgentsMd(templateContent, filterNames);
  const replaced = filtered.replace(/\{\{PROJECT\}\}/g, projectName);
  const destPath = join(workspaceDir, `${projectName}${SPEC_CENTER_SUFFIX}`, 'AGENTS.md');
  writeFileSync(destPath, replaced, 'utf-8');

  // Now merge custom module entries into the generated file
  const customModules = modules.filter(m => m.isCustom);
  if (customModules.length > 0) {
    mergeAgentsMd(workspaceDir, projectName, customModules);
  }
}

export function mergeAgentsMd(workspaceDir, projectName, newModules) {
  const agentsPath = join(workspaceDir, `${projectName}${SPEC_CENTER_SUFFIX}`, 'AGENTS.md');
  let content = readFileSync(agentsPath, 'utf-8');

  for (const mod of newModules) {
    const role = buildModuleRole(mod);
    const tableRow = `| \`${mod.name}\` | ${role} |`;
    content = insertIntoModuleMap(content, tableRow, mod.name);

    const treeEntry = buildModuleTreeEntry(projectName, mod.name, role);
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
    if (lines[i].includes('| Module |')) {
      tableStart = i;
    }
    if (tableStart !== -1 && separatorIdx === -1 && /^\|[-:|]+\|/.test(lines[i])) {
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

  // Check for duplicate module name
  const dataRows = lines.slice(separatorIdx + 1, tableEnd + 1);
  const alreadyExists = dataRows.some(row => row.includes(`\`${moduleName}\``));
  if (alreadyExists) return content;

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
  const lines = content.split('\n');

  // Find the last code block close (```) — that's where the tree lives
  let treeBlockClose = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trimStart() === '```') {
      treeBlockClose = i;
      break;
    }
  }

  // Find the last top-level tree entry (├── or └── without leading │)
  let lastEntryStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^[│ ]{0,3}(├──|└──)/.test(lines[i])) {
      lastEntryStart = i;
    }
  }

  if (lastEntryStart === -1 || treeBlockClose === -1) {
    // Fallback: append before last code block close
    const lastCodeBlock = content.lastIndexOf('```');
    if (lastCodeBlock === -1) return content;
    const before = content.substring(0, lastCodeBlock);
    const after = content.substring(lastCodeBlock);
    return before + treeEntry + '\n' + after;
  }

  // Find the end of the last entry's sub-tree
  let lastEntryEnd = lastEntryStart;
  for (let i = lastEntryStart + 1; i < treeBlockClose; i++) {
    if (/^[│ ]{0,3}(├──|└──)/.test(lines[i])) break;
    lastEntryEnd = i;
  }

  // Change the old last entry's └── to ├── if needed
  if (lines[lastEntryStart].includes('└──')) {
    lines[lastEntryStart] = lines[lastEntryStart].replace('└──', '├──');
    // Fix sub-tree indentation: every 4-space indent group becomes │   
    // "    ├──" → "│   ├──", "        └──" → "│   │   └──"
    for (let i = lastEntryStart + 1; i <= lastEntryEnd; i++) {
      lines[i] = lines[i].replace(/^( {4})+/g, (match) => {
        return '│   '.repeat(match.length / 4);
      });
    }
  }

  // Insert the new entry after the last entry's sub-tree
  lines.splice(lastEntryEnd + 1, 0, treeEntry);
  return lines.join('\n');
}

function buildModuleRole(mod) {
  if (!mod.isCustom) return getModuleRole(mod.templateRef);
  try {
    return getModuleRole(mod.templateRef);
  } catch {
    const capitalizedName = mod.name.charAt(0).toUpperCase() + mod.name.slice(1);
    return `${capitalizedName} application`;
  }
}

function buildModuleTreeEntry(projectName, moduleName, role) {
  const dirName = `${projectName}-${moduleName}`;
  const cap = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  return [
    `└── ${dirName}/            # ${role}`,
    `    ├── AGENTS.md                 # ${cap}-specific conventions`,
    '    └── docs/',
    `        ├── specs/                # ${cap}-specific specifications`,
    '        │   └── .gitkeep',
    `        └── plans/                # ${cap}-specific implementation plans`,
    '            └── .gitkeep',
  ].join('\n');
}
