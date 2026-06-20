# CLAUDE.md

本文件是 Claude Code 的项目指令文件。

## 项目概述

Immersive Galgame System 是一个 SillyTavern（酒馆）的酒馆助手脚本，提供视觉小说阅读器、AI 图片生成集成、场景素材模式和统一设置面板。

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
3. `app/tests/gate-contract.test.js` — `assert.match(bundle, /IGS version: X\.Y\.Z/)` 和 `assert.equal(manifest.version, 'X.Y.Z')`
4. `app/tests/simulate.test.js` — `assert.equal(entry.getAttribute('data-igs-version'), 'X.Y.Z')`
5. `README.md` — 当前状态行和更新日志

## 提交与推送规则

- 每次有文件改动必须提交并推送到 main（`git push origin main`）。
- **tag 与 push 分离**：push 可随时累加；版本标签（`git tag vX.Y.Z`）只在真机 CDP 测试通过后才打并推送（见下文「Bug 修复闭环」）。loader 拉取 `@main`，push 到 main 后真机即可加载新代码验证。
- 真机测试失败时回去继续修，同一版本号继续 commit+push，不打 tag。
- 禁止覆盖旧标签；不要用 `git tag -d` + 重建的方式覆盖已推送的标签。标签已存在时提升 patch 版本号重来。

## Bug 修复闭环

修复 bug 按以下闭环，**真机测试通过才算结束、才打 tag**：

1. 修复 + 本地 `npm run gate` 全绿。
2. 本地预验：用真机导出的真实数据本地复跑修复后代码，确认逻辑正确（第一道闸，能挡掉方向性错误）。
3. `git commit` + `git push origin main`（先推 main，让真机能加载新 bundle；暂不打 tag）。
4. CDP 真机测试：触发真机重载新 bundle，抓状态确认现象消失（第二道闸）。
5. 成功才 `git tag vX.Y.Z` + `git push origin vX.Y.Z`；失败回到第 1 步继续修。

真机调试用 CDP 直连自动注入（详见 `docs/AI_WORKFLOW.md` 的「真机调试与复验」）。CDP 不可用（用户不在/不愿重启浏览器/手机端）时，本地 gate + 真机导出数据本地复跑通过即可打 tag 结束，并在回复注明未做 CDP 真机终验。


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

- `app/src/scene/scene-directives.js` — @igs-scene 标签解析
- `app/src/host/prompt-injector.js` — AI 提示词注入
- `app/src/visual/igs-ui/reader-host.js` — 设置面板 + 阅读器渲染
- `app/src/scene/message-source.js` — 正文管线集成
