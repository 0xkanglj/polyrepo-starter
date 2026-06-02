# 简化 init/add 命令交互逻辑

## 背景

当前 `init` 和 `add` 命令都包含 `+ Custom module...` 选项，用户需要输入模块名 + 选择参考模板来创建自定义模块。这个流程较为繁琐，且 init 和 add 的 custom 逻辑重复。

## 目标

- **init**：移除 custom 逻辑，简化为固定模块多选
- **add**：改为单选 + 可选改名，将 custom 能力内化到改名流程中，减少用户认知负担

## 关键定义

**isCustom**：当且仅当模块名 ≠ 模板引用名时为 `true`（即用户改了名）。该字段决定 `createModule()` 是否执行模板名替换（`scaffold.js` 中 `MODULE_NAME` / `TEMPLATE_REF` 替换逻辑）。

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

使用 `select` 单选，展示所有模块（排除 spec-center），**不区分已存在与否**：

```
? 选择要添加的模块: (单选)
  admin
  mobile
  server
  web
```

同一模板可以被多次使用（只要最终模块名不同）。已存在信息在 2.2 模块名确认阶段体现。

#### 2.2 模块名确认

选中模板后，根据该模板名是否已被用作模块名，走不同分支：

**模板名未被使用**（即 workspace 中不存在 `项目名-模板名` 目录）：
```
? 模块名: (默认值 = 选中模板名，用户可直接回车确认或输入新名)
```

**模板名已被使用**（即 workspace 中已存在 `项目名-模板名` 目录）：
```
? 模块名: (无默认值，必须输入新名称)
  ⚠ 模块 "模板名" 已存在，请输入不同的名称
```

校验规则（循环直至通过）：
1. 非空校验：不能为空
2. 合法性：`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`，2-50 字符
3. 唯一性：不能与 workspace 中已有模块 或 本次会话已添加的模块 重名

校验不通过时重新提示输入，显示具体错误信息。

#### 2.3 循环添加

模块创建成功后：
```
? 继续添加下一个模块？ (Y/n, 默认 N)
```

- Y → 回到 select 列表
- N → 结束，输出汇总

#### 2.4 CLI 参数变更

- **移除** `-c, --custom` 参数。custom 能力已内化到单选 + 改名流程中。
- **保留** `-m, --modules <list>` 参数。行为与当前一致：逗号分隔模板名，按模板名直接创建（不支持改名，`isCustom` 始终为 `false`）。指定 `--modules` 时跳过交互式循环，直接批量创建后输出汇总。

#### 2.5 dry-run 处理

`--dry-run` 时，跳过实际创建，循环中每确认一个模块即打印：

```
  Would create: myproject-mymodule/
```

不走交互式循环，改为逐模块打印预览。若同时指定了 `--modules`，则直接批量预览。

#### 2.6 错误处理

- **Ctrl+C 中断**：捕获 `ExitPromptError`，已创建的模块不回滚（与当前行为一致），打印 "Aborted." 并列出已成功创建的模块。
- **模板列表为空**：若 `templates/` 下除 spec-center 外无其他模块，提示 "No modules available to add." 并退出。

### 3. 文件改动清单

| 文件 | 改动说明 |
|---|---|
| `src/utils/prompt.js` | 移除 `promptCustomModule()`；简化 `promptModules()` 移除 custom 选项；新增 `promptAddOneModule(existingModules)` 和 `promptModuleName(templateName, existingModules, sessionAdded)` |
| `src/commands/init.js` | 无逻辑改动（`promptModules()` 签名不变） |
| `src/commands/add.js` | 重写为单选循环逻辑，移除 `-c/--custom` 相关代码；`--modules` 保留原批量逻辑；新增 `--dry-run` 循环处理 |
| `src/cli.js` | 移除 `add` 命令的 `-c, --custom` option |
| `src/core/agents-sync.js` | 更新 `buildModuleRole()`：当 `isCustom` 为 true 且 `templateRef` 有对应模板时，优先使用 `getModuleRole(templateRef)` 获取描述，仅在无法获取时 fallback 到 `${capitalizedName} application` |

### 4. 核心函数签名

```js
// prompt.js

// init 用：多选固定模块（排除 spec-center）
promptModules() → Array<{name, templateRef, isCustom: false}>

// add 用：单选一个模块（内部调用 getAvailableTemplateNames()，只接收 existingModules 用于标记）
promptAddOneModule(existingModules) → {templateName}

// add 用：确认/输入模块名，含合法性+唯一性校验循环
// isCustom = (name !== templateName)
promptModuleName(templateName, existingModules, sessionAdded) → {name, templateRef, isCustom}
```

### 5. add 命令伪码

```js
async function addCommand(options) {
  // 1. 检测 workspace（不变）
  // 2. 扫描已有模块

  // --modules: 批量模式，跳过交互循环
  if (options.modules) {
    const toAdd = parseModuleList(options.modules);
    // 跳过已存在的（同当前逻辑）
    const filtered = toAdd.filter(m => !existingModules.includes(m.name));
    if (options.dryRun) {
      for (const mod of filtered) {
        console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
      }
      return;
    }
    for (const mod of filtered) {
      const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
      createModule(mod.templateRef, modDir, projectName, mod);
    }
    if (filtered.length > 0) mergeAgentsMd(workspaceDir, projectName, filtered);
    printSummary(workspaceDir, projectName, filtered, 'added');
    return;
  }

  const addedModules = [];

  while (true) {
    const selected = await promptAddOneModule(existingModules);

    const mod = await promptModuleName(
      selected,
      existingModules,
      addedModules.map(m => m.name),
    );

    if (options.dryRun) {
      console.log(`  Would create: ${moduleLabel(projectName, mod)}/`);
    } else {
      const modDir = path.join(workspaceDir, `${projectName}-${mod.name}`);
      createModule(mod.templateRef, modDir, projectName, mod);
    }

    addedModules.push(mod);
    existingModules.push(mod.name);

    const more = await confirm({
      message: '继续添加下一个模块？',
      default: false,
    });
    if (!more) break;
  }

  if (!options.dryRun && addedModules.length > 0) {
    mergeAgentsMd(workspaceDir, projectName, addedModules);
  }

  printSummary(workspaceDir, projectName, addedModules, 'added');
}
```

### 6. 测试策略

**单元测试**（`tests/prompt.test.js`）：
- `promptModuleName()` 校验逻辑：合法名通过、非法名拒绝、唯一性冲突拒绝、模板名已存在时无默认值
- `parseModuleList()`：空项过滤、逗号分隔解析

**手动验证场景**：
- init 交互式多选（不含 custom 选项）
- add 单选 → 直接回车确认（不改名）
- add 单选 → 输入新名（改名，isCustom=true）
- add 连续添加多个模块
- add `--modules admin,mobile` 批量模式
- add `--dry-run` 预览模式
- Ctrl+C 中断后确认已创建模块保留
