# CLAUDE.md

本文件是 Claude Code 的项目指令文件。

## 项目概述

Visual Novel 是一个 SillyTavern（酒馆）的酒馆助手脚本，提供视觉小说阅读器、AI 图片生成集成、场景素材模式和统一设置面板。

## 关键路径

- 源码：`app/src/`
- 测试：`app/tests/`
- 构建产物：`app/dist/`
- 远程加载器：`loader/`
- 文档：`docs/`

## 验收命令

```bash
npm run gate    # 完整验收：structure + static + test + simulate + perf + build
npm test        # 单元测试（53 个）
npm run simulate # 模拟测试（37 个）
npm run build   # 构建 bundle
```

## 版本号同步清单

每次版本变更时，以下文件必须全部同步更新：

1. `app/package.json` — `"version": "X.Y.Z"`
2. `app/src/core/bootstrap.js` — `version: 'X.Y.Z'`
3. `app/tests/gate-contract.test.js` — `assert.match(bundle, /VN version: X\.Y\.Z/)` 和 `assert.equal(manifest.version, 'X.Y.Z')`
4. `app/tests/simulate.test.js` — `assert.equal(entry.getAttribute('data-vn-version'), 'X.Y.Z')`
5. `README.md` — 当前状态行和更新日志

## 提交与推送规则

- 每次有文件改动必须提交并推送到 GitHub
- 每次提交必须创建新版本标签（`git tag vX.Y.Z`），禁止覆盖旧标签
- 推送命令：`git push origin main --tags`
- 不要用 `git tag -d` + 重建的方式覆盖已推送的标签

## 修改前必读

1. `README.md`
2. `AGENTS.md`（协作规则，不要修改此文件）
3. 目标模块的 `CONTRACT.md`

## 代码风格

- 无注释优先，只在 WHY 不明显时加一行注释
- 不加 JSDoc、不加 TODO 注释
- 测试名以 `gate:` 前缀开头
- ES Module 语法，Node 原生 test runner

## 场景素材模式相关文件

- `app/src/scene/scene-directives.js` — @vn-scene 标签解析
- `app/src/host/prompt-injector.js` — AI 提示词注入
- `app/src/visual/visual-novel-ui/reader-host.js` — 设置面板 + 阅读器渲染
- `app/src/scene/message-source.js` — 正文管线集成
