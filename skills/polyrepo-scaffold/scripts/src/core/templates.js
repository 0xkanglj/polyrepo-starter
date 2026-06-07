import { readdirSync, statSync, readFileSync } from 'fs';
import { resolveTemplatesDir } from '../utils/path.js';

/**
 * 返回可用模板名列表（从 templates/ 目录动态发现）
 * 不包含 'root'（root 是 workspace 级配置，不是可选模块）
 * @returns {string[]}
 */
export function getAvailableTemplateNames() {
  const templatesDir = resolveTemplatesDir();
  return readdirSync(templatesDir)
    .filter(name => statSync(resolveTemplatesDir(name)).isDirectory())
    .filter(name => name !== 'root');
}

/**
 * 从模板 AGENTS.md 提取 Role 描述（## Role 下第一行）
 * @param {string} templateName - 模板名
 * @returns {string} Role 描述
 */
export function getModuleRole(templateName) {
  const agentsPath = resolveTemplatesDir(templateName, 'AGENTS.md');
  const content = readFileSync(agentsPath, 'utf-8');
  const match = content.match(/## Role\n(.+)/);
  return match ? match[1].trim() : templateName;
}

/**
 * 校验模板是否存在
 * @param {string} templateName - 模板名
 * @returns {boolean}
 * @throws {Error} 模板不存在时抛出异常
 */
export function validateTemplate(templateName) {
  try {
    const templatePath = resolveTemplatesDir(templateName);
    if (!statSync(templatePath).isDirectory()) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Template not found: ${templateName}`);
    }
    throw error;
  }
}