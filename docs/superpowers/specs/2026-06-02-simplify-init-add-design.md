# 简化 init/add 命令交互逻辑

## 背景

当前 `init` 和 `add` 命令都包含 `+ Custom module...` 选项，用户需要输入模块名 + 选择参考模板来创建自定义模块。这个流程较为繁琐，且 init 和 add 的 custom 逻辑重复。

## 目标

- **init**：移除 custom 逻辑，简化为固定模块多选
- **add**：改为单选 + 可选改名，将 custom 能力内化到改名流程中，减少用户认知负担

## 设计

### 1. init 命令简化

`promptModules()` 移除 `+ Custom module...` 选项，仅展示 `templates/` 下除 `spec-center` 外的所有模块（动态扫描）。spec-center 仍然自动强制包含，不在列表中展示。

交互流程：

```
? Select modules: (多选 checkbox)
  ◯ admin
  ◉ mobile
  ◯ server
  ◉ web
```

**不变的部分**：
- spec-center 自动强制包含
- `--modules` CLI 参数仍然支持（逗号分隔模块名）
- dry-run 逻辑不变

### 2. add 命令重构

改为单次添加一个模块的循环流程。

#### 2.1 模块选择

使用 `select` 单选，展示所有模块（排除 spec-center），已存在的模块加 `[已存在]` 标识：

```
? 选择要添加的模块: (单选)
  admin
  mobile [已存在]
  server
  web [已存在]
```

#### 2.2 模块名确认

选中模块后，根据模块是否已存在走不同分支：

**模块不存在**：
```
? 模块名: (默认值 = 选中模板名，用户可直接回车确认或输入新名)
```

**模块已存在**：
```
? 模块名: (无默认值，必须输入)
```

校验规则（循环直至通过）：
1. 合法性：`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`，2-50 字符
2. 唯一性：不能与 workspace 中已有模块 或 本次会话已添加的模块 重名

校验不通过时重新提示输入，显示具体错误信息。

#### 2.3 循环添加

模块创建成功后：
```
? 继续添加下一个模块？ (Y/n, 默认 N)
```

- Y → 回到 select 列表（列表状态更新：刚添加的模块已变为 `[已存在]`）
- N → 结束，输出汇总

#### 2.4 CLI 参数变更

移除 `-c, --custom` 参数。custom 能力已内化到单选 + 改名流程中。

### 3. 文件改动清单

| 文件 | 改动说明 |
|---|---|
| `src/utils/prompt.js` | 移除 `promptCustomModule()`；简化 `promptModules()` 移除 custom 选项；新增 `promptAddOneModule()` 和 `promptModuleName()` |
| `src/commands/init.js` | 无逻辑改动（`promptModules()` 签名不变） |
| `src/commands/add.js` | 重写为单选循环逻辑，移除 `-c/--custom` 相关代码 |
| `src/cli.js` | 移除 `add` 命令的 `-c, --custom` option |
| `src/core/agents-sync.js` | 无改动 |
| `src/core/scaffold.js` | 无改动 |
| `src/core/templates.js` | 无改动 |

### 4. 核心函数签名

```js
// prompt.js

// init 用：多选固定模块（排除 spec-center）
promptModules() → Array<{name, templateRef, isCustom}>

// add 用：单选一个模块
promptAddOneModule(allModules, existingModules) → {templateName}

// add 用：确认/输入模块名，含合法性+唯一性校验循环
promptModuleName(templateName, existingModules, sessionAdded) → {name, templateRef, isCustom}
```

### 5. add 命令伪码

```js
async function addCommand(options) {
  // 1. 检测 workspace（不变）
  // 2. 扫描已有模块

  const sessionAdded = [];

  while (true) {
    const allModules = getAvailableTemplateNames()
      .filter(m => m !== SPEC_CENTER_NAME);

    const choices = allModules.map(name => ({
      name: existingModules.includes(name)
        ? `${name} [已存在]`
        : name,
      value: name,
    }));

    const selected = await select({
      message: '选择要添加的模块:',
      choices,
    });

    const mod = await promptModuleName(
      selected,
      existingModules,
      sessionAdded,
    );

    // 创建模块
    createModule(mod.templateRef, modDir, projectName, mod);
    sessionAdded.push(mod.name);
    existingModules.push(mod.name);

    // 继续添加？
    const more = await confirm({
      message: '继续添加下一个模块？',
      default: false,
    });
    if (!more) break;
  }

  // merge AGENTS.md（批量处理本次添加的所有模块）
  if (sessionAdded.length > 0) {
    mergeAgentsMd(workspaceDir, projectName, addedModules);
  }

  printSummary(workspaceDir, projectName, addedModules, 'added');
}
```
