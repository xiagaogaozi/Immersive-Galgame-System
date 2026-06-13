# 沉浸式galgame系统

JS-Slash-Runner（酒馆助手）沉浸式 Galgame 系统项目。

## 当前定位

- 中文名：沉浸式 Galgame 系统
- 英文缩写：IGS（Immersive Galgame System）
- 全局对象：`window.IGS`
- 完整对象：`window.ImmersiveGalgameSystem`
- CSS 前缀：`.igs-`
- DOM 属性：`data-igs-*`
- 存储前缀：`igs:*`
- Mod 后缀：`.igs-mod.js`
- 预设后缀：`.igs-preset.json`
- 资源包后缀：`.igs-pack.json`

## 当前状态

- 阶段：最小闭环已接通
- 形态：独立 app 工程，已有 Node 原生测试与验收闸门
- 当前运行版本 `v0.3.1`：修复网页全屏与浏览器全屏中打开设置页时只显示空壳、tabs/body 不可见的问题；魔法棒入口显示名继续固定为 `沉浸式 Galgame 系统`，入口形态继续保留原版 `fa-book-open` 单入口。
- `v0.3.1` 已把“web/fullscreen 设置页必须跟随 visualViewport 偏移并完整显示 shell/head/tabs/body”固定为回归闸门；`v0.3.0` 已固定正文 fallback、pc/mobile 浮窗几何、web 滚动锁定、fullscreen 请求全屏、隐藏恢复和 toast 边界反馈。
- 当前不保留奶龙工具箱发布壳，不走奶龙工具箱流程校验。
- 保留独立 `loader/` 目录，用于后续 GitHub 远程 bundle 自动更新入口。
- 最终酒馆导入形态：`loader/igs-loader.json`，格式参考 `_inbox/酒馆助手脚本-玉子手机.json`。
- 原版 Visual Novel 脚本来源：`D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\Visual Novel`。
- 策划书版本归档目录：`plan/`
- 项目级 AI 工作流入口：`AGENTS.md`
- 当前验收策略：`npm run gate`，fixtures 驱动的模拟测试，不要求安装版实机校验。
- GitHub 仓库：`https://github.com/xiagaogaozi/immersive-galgame-system`

## 项目目标

本项目目标是把原 Visual Novel 脚本升级为一个可扩展的沉浸式 Galgame 运行时：

- 继续保留 Visual Novel 已有的阅读器、魔法棒入口、正文解析、图像 API、外部插图扩展适配和移动/桌面阅读模式。
- 使用 GitHub 远程 bundle 发布主程序，酒馆内只导入小型自动更新 loader。
- 建立能力分组导入系统，不提供独立总 Mod 管理页；生图插件、选项组件、UI 预设、背景/立绘资源、正文正则预设都在各自页面管理。
- 建立 `Mod / Preset / Pack` 三层边界：Mod 扩展代码能力，Preset 切换配置，Pack 管理背景、立绘、头像和本地持久资源。
- 提供 shujuku 表格可编辑前端，但不重复 shujuku 自带的模板导入能力。
- 提供 AI 友好的模块契约、fixtures、模拟测试与工作流，方便后续由 AI 逐步实现。

## 目录约定

```text
projects/沉浸式galgame系统/
├── README.md
├── AGENTS.md                        项目级 AI 协作流程
├── 功能总集表.md
├── plan/                           每个版本的策划书归档
├── loader/                         远程 bundle 自动更新 loader
├── app/
│   ├── src/
│   │   ├── index.js
│   │   ├── core/
│   │   ├── host/
│   │   ├── actions/
│   │   ├── components/
│   │   ├── registry/
│   │   ├── storage/
│   │   ├── data/
│   │   │   └── shujuku/
│   │   ├── scene/
│   │   ├── visual/
│   │   ├── media/
│   │   ├── backgrounds/
│   │   ├── characters/
│   │   ├── generated-images/
│   │   │   ├── providers/
│   │   │   └── request-builders/
│   │   ├── prompts/
│   │   │   ├── adapters/
│   │   │   └── schemas/
│   │   ├── schemas/
│   │   ├── presets/
│   │   ├── mods/
│   │   ├── shujuku-panel/
│   │   ├── styles/
│   │   ├── hotkeys/
│   │   ├── choices/
│   │   └── api/
│   ├── fixtures/
│   │   ├── tavern/
│   │   ├── shujuku/
│   │   ├── media/
│   │   ├── providers/
│   │   ├── imports/
│   │   └── styles/
│   ├── tests/
│   ├── scripts/
│   ├── package.json
│   └── dist/
└── docs/
    ├── AI_WORKFLOW.md
    ├── ARCHITECTURE.md
    ├── PACKAGING_WORKFLOW.md
    ├── SCHEMA_AND_FIXTURES.md
    ├── API_FOR_MOD_AUTHORS.md
    ├── IMAGE_GENERATION.md
    ├── MOD_FORMAT.md
    ├── PRESET_FORMAT.md
    ├── IMPORT_GROUPS.md
    ├── SCENE_RULES.md
    ├── STYLE_SYSTEM.md
    ├── SHUJUKU_PANEL.md
    └── RELEASE.md
```

## 修改流程

本项目当前绕过奶龙工具箱发布项目结构，只保留已确认的沉浸式 Galgame 系统架构：

1. 修改前先读 `AGENTS.md`、`docs/AI_WORKFLOW.md`、`功能总集表.md` 和目标模块的 `CONTRACT.md`。
2. 每次形成或更新版本策划书时，必须放入 `plan/`，文件名使用 `v版本号-主题.md`，例如 `plan/v0.1.5-验收闸门策划书.md`。
3. 功能代码只进入 `app/src/<能力模块>/`。
4. shujuku 数据读写进入 `app/src/data/shujuku/`，表格 UI 进入 `app/src/shujuku-panel/`。
5. 通用图片池进入 `app/src/media/`，背景、立绘、生图业务分别进入 `backgrounds/`、`characters/`、`generated-images/`。
6. 跨模块共享数据结构进入 `app/src/schemas/`；模型提示词和工作流 schema 继续放在 `app/src/prompts/schemas/`。
7. 架构、API、预设、场景规则、样式系统、发布说明和 AI 协作说明只进入 `docs/`。
8. 测试数据进入 `app/fixtures/`，模拟测试进入 `app/tests/`。
9. 当前本机可执行验收入口是 `npm run gate`，顺序为 `structure -> static -> test -> simulate -> perf -> build`。
10. 后续接入 pnpm 后，保持 `pnpm build`、`pnpm test`、`pnpm simulate`、`pnpm perf`、`pnpm gate` 与 npm 命令等价。
11. 本项目当前用模拟测试替代实机校验；不得把安装版实机验真作为默认交付要求。
12. 不要走奶龙工具箱流程校验：本项目不得运行奶龙工具箱 `pack-project`、`verify-project`、`validate`、`check-refs` 作为验收，除非用户明确要求重新接入工具箱流程。
13. 项目级变更只记录在本 README，不写入工具箱 `CHANGELOG.md`。
14. 涉及打包、发布、上传、loader、远程 bundle 或酒馆助手脚本 JSON 时，必须先读 `docs/PACKAGING_WORKFLOW.md` 与 `docs/RELEASE.md`。
15. `loader/` 只放自动更新入口；阅读器、设置面板、shujuku、Provider、Mod、Preset、Pack 等业务逻辑必须留在 `app/src/`。

## 更新日志

### v0.3.1 - 2026-06-13

- 修复 `web` 网页全屏与 `fullscreen` 浏览器全屏模式下打开设置页时设置面板只剩顶部空壳、tabs/body 不显示或落在可视区外的问题。
- `app/src/visual/visual-novel-ui/settings-style.js` 恢复原版 Visual Novel 的 `#vnm-unified-settings` viewport 盒模型：使用 `--vnm-settings-vleft / --vnm-settings-vtop / --vnm-settings-vw / --vnm-settings-vh` 控制 `left / top / width / height`，并保留原版设置页按钮、tabs 和毛玻璃面板样式。
- `app/src/visual/visual-novel-ui/reader-host.js` 为设置面板补回 `visualViewport.resize / visualViewport.scroll / resize / orientationchange` 监听，关闭设置页时会清理事件和 RAF；Node 模拟环境增加设置页 fallback DOM，用于稳定断言 shell/head/tabs/body。
- 扩展 `app/tests/gate-contract.test.js` 与 `app/tests/simulate.test.js`：新增设置 CSS viewport 变量契约，以及 `web/fullscreen` 打开设置后完整渲染并随 visualViewport 偏移更新的回归测试。
- `app/package.json`、`app/src/core/bootstrap.js`、阅读器源码默认版本与 `loader/igs-loader.js` 默认标签同步提升到 `v0.3.1`；本轮发布需重新生成 `app/dist/manifest.json` 与 `loader/igs-loader.json`。

### v0.3.0 - 2026-06-13

- 重构 `app/src/visual/visual-novel-ui/reader-host.js` 的运行时层，补齐原版 VN 的四模式行为：`pc` 固定 `900x540` 浮窗、`mobile` 固定 `480x680` 浮窗、`web` 模式锁定 `body/html` 滚动并跟随 `visualViewport` 高度、`fullscreen` 模式主动调用浏览器 `requestFullscreen` 并在退出全屏时关闭阅读器。
- 修复正文 fallback：当 `scene.text` 为空字符串时，阅读器现在会继续回退到 `formattedText / visibleText / cleanedRaw`，不再出现只剩黑底和工具栏、正文为空的假死状态。
- 恢复原版可见交互：点击背景层可翻页，隐藏后可再次点击背景层恢复，`Escape / ArrowLeft / ArrowRight / Space / H` 键与原版一致；`#vnm-toast` 现在会显示段落边界、楼层切换缺宿主、保存/重绘结果等提示。
- `app/src/visual/visual-novel-ui/original-reader-source.js` 补回 `#vnm-send-status` 与 spinner 结构，保持原版工具栏 SVG、选择器和单入口契约；`app/fixtures/visual-novel-ui/original-reader-snapshot.json` 同步扩展契约快照。
- 扩展 `app/tests/unit.test.js`、`app/tests/simulate.test.js`：新增空正文 fallback、`pc/mobile` 浮窗几何、`web` 滚动锁定、`fullscreen` 全屏请求、隐藏恢复和 toast 边界反馈的模拟闸门，确保这轮修复不会再悄悄退化。
- `app/package.json`、`app/src/core/bootstrap.js`、`loader/igs-loader.js` 默认版本已同步提升到 `v0.3.0`；本轮发布后需要重新生成 `app/dist/manifest.json` 与 `loader/igs-loader.json`。

### v0.2.14 - 2026-06-13

- 新增 `app/src/generated-images/reader-image-service.js`、`app/src/generated-images/provider-runtime.js` 与 `app/src/media/message-image-cache.js`，把原版 VN 的楼层图片收集、缓存、外部 provider 重绘轮询和保存下载链路拆成独立运行时模块。
- `app/src/host/tavern-helper-adapter.js` 新增 `listMessages()`、`getAdjacentMessage()`、`jumpToMessage()`、`findRegenerateButton()`，并按原版 VN 语义补齐可读楼层筛选、消息归一化和重绘按钮定位。
- `app/src/api/visual-novel-compat.js` 与 `app/src/core/bootstrap.js` 现已接通 `openViewerFromMessage()` 的 `startAtEnd`/`message` 透传、跨楼层跳转、内置 image provider 注册，以及阅读器级 `collectMessageImages()` / `generateImage()` / `saveImage()`。
- `app/src/visual/visual-novel-ui/reader-host.js` 现已恢复原版 VN 的 `prev-turn` / `next-turn`、图片重绘、图片保存和按图片数量刷新的进度文本；跨楼层返回上一轮时会从末段打开，保持原版阅读节奏。
- `loader/igs-loader.js`、`app/package.json`、`app/dist/manifest.json` 与阅读器源码默认版本同步提升到 `v0.2.14`；`loader/igs-loader.json` 需由 `npm run build:loader` 重新生成并与源码保持完全一致。
- 扩展 `app/tests/simulate.test.js`、`app/tests/gate-contract.test.js`、`app/tests/unit.test.js`，新增跨楼层切换、provider 图片提取、保存返回可下载 URL、外部重绘轮询更新背景等模拟验收闸门。

### v0.2.13 - 2026-06-12

- 修复阅读器控制器与 DOM 挂载参数错位导致的工具栏全失效问题：`settings`、`hide`、`toggle-bar`、`close` 现在会走真实 controller 行为，关闭会同时卸载阅读器和设置面板。
- 魔法棒入口显示名固定为 `沉浸式 Galgame 系统`，继续保留原版 `data-vnm-magic-entry="1"`、`vnm-magic-entry`、`fa-book-open` 单入口契约，并清理旧 `[data-igs-magic-entry]` 残留。
- 阅读器工具栏恢复原版 SVG 图标、`#vnm-bar-btns` 收纳区、`#vnm-bar-pinned` 常驻区、`toggle-bar` 与 `close` 常驻按钮；默认状态与原版一致为收纳。
- 设置面板基础页的 `bridge.openMode` 四模式切换现在会即时同步 active reader mode；阅读器页补回常驻按钮配置并持久化到 `vnm-reader-settings-v9-<mode>`。
- `prev` / `next` 不再是空占位，已能在当前楼层正文段落之间切换并刷新进度；`prev-turn` / `next-turn` 在模拟环境返回明确宿主消息列表需求，不再静默无响应。
- 扩展 `app/tests/simulate.test.js` 与合约测试，覆盖入口名、SVG 图标、默认收纳、设置打开、四模式切换、隐藏、关闭卸载、段落切换和宿主 UI HTML 泄漏防护。
- 本轮仍不修改原版 `projects/Visual Novel/**`；上一轮/下一轮跨楼层真实 DOM 图片缓存与真实 provider 重画/保存仍需后续在 host/generated-images 层继续补齐。

### v0.2.12 - 2026-06-12

- 新增 `app/src/scene/message-source.js`，迁移原版 Visual Novel 的 `DEFAULT_SOURCE_FILTER`、`DEFAULT_VIRTUAL_REGEX`、`getVisibleMessageText()`、`cleanNarrativeSource()`、`buildFormattedTextPipeline()` 和强制 fallback 语义，统一正文提取、正文格式化和宿主 HTML 泄漏防护。
- `app/src/api/visual-novel-compat.js` 现在在 `openLatestAvailable()` / `openViewerFromMessage()` 前先构建 VN 正文 payload，再把清洗后的 `textScene` 送入 `refresh()`，避免 reader 继续直接拿宿主原始 HTML 当正文。
- `app/src/host/magic-wand-entry.js` 当时恢复了原版单一入口契约：`vnm-magic-entry`、`data-vnm-magic-entry="1"`、`fa-book-open`，并在重扫/销毁时主动清理旧 `[data-igs-magic-entry]` 残留；入口显示名误保留为 `Visual Novel`，已在 `v0.2.13` 改回 `沉浸式 Galgame 系统`。
- `app/src/host/tavern-helper-adapter.js` 增加消息筛选和 DOM 可见正文回填，优先打开最近一条可读的非用户消息，并把 `.mes_text` 提取结果作为 `visibleText` 参与 fallback。
- 新增 `app/fixtures/tavern/host-ui-leak-message.json`，扩展 `app/tests/unit.test.js`、`app/tests/simulate.test.js`、`app/tests/gate-contract.test.js`，固定“只有一个魔法棒入口”“图标必须是 `fa-book-open`”“宿主 UI HTML 不得进入 `.vnm-text`”的回归闸门。
- runtime、manifest、loader 默认版本同步提升到 `v0.2.12`，本轮已通过 `npm run gate` 和 `npm run build:loader`。

### v0.2.12-plan - 2026-06-12

- 归档 `plan/v0.2.12-原版VN可用性修复施工图.md`，当时目标是恢复原版 `fa-book-open` 魔法棒入口并修复阅读器把酒馆宿主 HTML 当正文显示的问题；该计划曾沿用 `Visual Novel` 入口文案，已在 `v0.2.13` 按项目名纠正。
- 施工图要求迁移原版 `getVisibleMessageText()`、`cleanNarrativeSource()`、`buildFormattedTextPipeline()` 的正文抽取和清洗语义，并补截图同款 host UI HTML 泄漏回归 fixture。
- 本条为已执行归档；对应实现已在同日发布为 `v0.2.12`。

### v0.2.11 - 2026-06-12

- 修复重复启用自动更新脚本时只弹出“已加载”而不注册魔法棒入口的问题：loader 现在检测到新版 IGS 已存在时会调用 `ensureMagicWandEntry()` 重扫入口。
- 如果页面残留旧版 `window.IGS`、旧 script/link 或旧 `__IGS_AUTO_UPDATE_LOADER__`，loader 会清理残留并重新加载当前版本，避免旧实例阻断新入口注册。
- loader 加载 bundle 后会短时重试 `ensureMagicWandEntry()`，对齐原版 Visual Novel 的“菜单重建后继续重扫入口”行为。

### v0.2.10 - 2026-06-12

- 修复 JS-Slash-Runner 导入报错：`loader/igs-loader.json` 恢复为 `button.enabled=false`、`button.buttons=[]`，不再生成缺少 `visible` 字段的按钮项。
- 删除 `启动 IGS`、`重扫入口` 两个酒馆助手按钮；正式用户入口只保留酒馆魔法棒菜单里的 `沉浸式 Galgame`。
- 更新 loader 合约测试，强制要求自动更新脚本不提供额外按钮入口，防止后续偏离原版 Visual Novel 的入口形态。

### v0.2.9 - 2026-06-12

- 修复自动更新链路的 CDN 缓存风险：loader 默认先读取 `raw.githubusercontent.com/.../main/app/dist/manifest.json` 获取最新版本号，再加载 jsDelivr 的 `@v<version>` 不可变标签资源。
- `loader/igs-loader.js` 的内置兜底版本升为 `v0.2.9`；仍可通过 `window.IGS_LOADER_REF` 或 `window.IGS_LOADER_CONFIG.ref` 手动指定 `main`、旧标签或测试分支。
- 发布回查新增远程 CDN 内容确认：本轮已确认 `loader/igs-loader.json` 按钮可从 CDN 拉取；发现 `@main/app/dist/manifest.json` 可能返回旧缓存，因此默认链路不再依赖 jsDelivr 的 `@main` dist。

### v0.2.8 - 2026-06-12

- 新增 `app/src/host/magic-wand-entry.js`，启动后自动向酒馆魔法棒菜单 `#extensionsMenu`、`#extensions_menu`、`.extensions_block .list-group` 注入 `沉浸式 Galgame` 入口。
- `bootstrapIGS()` 现在会自动挂载魔法棒入口，点击入口会调用 `openLatestAvailable()` 打开最新可用楼层阅读器，并在 `destroy()` 时清理菜单项、委托点击和观察器。
- 公开 API 新增 `ensureMagicWandEntry()` 与 `getMagicWandEntryState()`，用于控制台手动重扫入口、诊断入口状态。
- 新增模拟测试覆盖“魔法棒菜单存在 -> IGS 注入入口 -> 点击入口 -> 阅读器打开”的最小闭环；本轮仍不执行真实酒馆实机校验。

### v0.2.7 - 2026-06-12

- 将“每轮结束必须上传 GitHub 并发布版本标签”写入 `AGENTS.md`、`docs/AI_WORKFLOW.md`、`docs/RELEASE.md` 与 `docs/PACKAGING_WORKFLOW.md`。
- 固定回退点规则：每轮有文件改动时必须 `git commit`、`git push origin main`、`git tag -a v<当前版本>`、`git push origin v<当前版本>`，并回查远程分支和标签。
- 标签已存在时禁止覆盖，必须提升 patch 版本后重新发布；只有用户明确要求不上传或不打标签时才允许跳过。

### v0.2.6 - 2026-06-12

- 新增 `app/src/visual/visual-novel-ui/*`，把原版 Visual Novel 的阅读器 overlay、统一设置面板、四个 tab、reader mode 图标和 `.vnm-*` selector 抽成独立等价层；浏览器环境挂真实 DOM，Node 模拟测试返回 snapshot/controller。
- 更新 `app/src/core/bootstrap.js`、`app/src/api/visual-novel-compat.js` 与 `app/src/storage/legacy-visual-novel.js`，让 `openSettings()` 不再返回 `settings-ui-not-mounted`，并接通 `openLatestAvailable()` / `openViewerFromMessage()` -> 原版阅读器 UI -> `typeAndSend()` 的最小闭环，同时支持旧 `vnm_*` 配置读写回写。
- 新增 `app/fixtures/visual-novel-ui/*`，并扩展 `app/tests/gate-contract.test.js`、`app/tests/simulate.test.js`，覆盖原版 selector/几何契约、四个 tab、设置保存回写，以及 `Enter` 发送 / `Shift+Enter` 不发送的模拟验收。
- 当前仍不做真实酒馆实机验真、不接真实 NAI/provider 网络请求、不把 `window.VisualNovelBridge` 旧全局别名重新挂回；本轮验收继续以 `npm run gate` 的模拟闸门为准。

### v0.2.5 - 2026-06-12

- 新增 `app/src/presets/preset-types.js`、`app/src/presets/preset-registry.js` 与 `app/src/storage/preset-store.js`，把三类文本预设接成可持久化的 `PresetRegistry`，固定 `current/items/drafts` 快照结构。
- 更新 `app/src/api/public-api.js`、`app/src/core/bootstrap.js` 与 `app/src/index.js`，让 `sceneRegexPresets`、`textFilterPresets`、`textFormatPresets` 支持 `setCurrent/getCurrent/export/exportAll`，并让 `refresh()` 在无显式 context 时读取注册表当前预设。
- 新增 `app/fixtures/presets/*`，补齐预设注册表快照、文本预设导入 bundle 和坏预设不能覆盖 current 的样例。
- 更新 `app/tests/unit.test.js`、`app/tests/gate-contract.test.js`、`app/tests/simulate.test.js`，覆盖注册表持久化重载、坏预设守卫、导出 bundle 形状和 fake storage 驱动的 refresh 闭环。
- 当前仍不实现正则与正文页 UI、不接真实 IndexedDB 异步启动、不做真实酒馆或真 provider 实机验真；验收继续以 `npm run gate` 的模拟测试为准。

### v0.2.4 - 2026-06-12

- 新增 `app/src/presets/text-presets.js` 与 `app/src/scene/text-pipeline.js`，把 `text-filter-preset`、`text-format-preset`、`scene-regex-preset` 接成可测试的正文预处理管线。
- 更新 `app/src/scene/text-parser.js`、`app/src/core/bootstrap.js` 与 `app/src/api/public-api.js`，让 `refresh()` 可接收三类文本预设，并把 `textSource`、`formattedText`、`sourceKind`、`formatSourceKind`、`textPipelineErrors` 暴露到 scene 和公开 API 分组。
- 新增 `app/fixtures/text/*`、`app/fixtures/imports/text-presets-bundle.json`，固定 `<content>` 过滤、Bubble 对话格式化、scene regex 字段提取和坏正则回退样例。
- 更新 `app/tests/unit.test.js`、`app/tests/gate-contract.test.js`、`app/tests/simulate.test.js`，补齐正文预设管线 gate、导入契约和 fake host refresh 模拟闭环。
- 当前仍不实现正则与正文页 UI、不做 preset 持久化切换、不迁移原版 Visual Novel DOM 图片探测，也不做真实酒馆实机验真。

### v0.2.3 - 2026-06-12

- 新增 `app/src/visual/reader-state.js` 与 `app/src/visual/stage-model.js`，把 reader settings、legacy reader mode、viewport 和稳定槽位归一化为可测试的 visual stage model。
- 更新 `app/src/visual/stage-renderer.js`、`app/src/visual/layer-controller.js` 与 `app/src/core/bootstrap.js`，让 `refresh()` 的渲染结果包含 `stage`、`renderedLayers` 和 reader bridge attributes。
- 新增 `app/fixtures/visual/*`，补齐 pc/mobile/web/fullscreen 的 reader settings 样例，以及普通场景/生图场景的 stage model 预期。
- 更新 `app/tests/unit.test.js`、`app/tests/gate-contract.test.js`、`app/tests/simulate.test.js`，把 `S4 visual` 验收到 reader state、responsive layout、stable slots、dialogue layer 和 generated layer。
- 当前仍不迁移完整 Visual Novel 阅读器 DOM，不实现真实设置面板，不接真实 provider，也不做真实酒馆实机验真。

### v0.2.2 - 2026-06-12

- 新增 `app/src/storage/legacy-visual-novel.js`，只读读取 `vnm_visual_novel_bridge_config`、`vnm-reader-settings-v9-*` 和 `vnm-display-mode`。
- 新增 `app/src/api/visual-novel-compat.js`，把 `openSettings()`、`getConfig()`、`getUnifiedSettings()`、`openViewerFromMessage()`、`openLatestAvailable()`、`generateImage()` 收敛到 IGS 兼容层。
- 更新 `bootstrapIGS()` 与 `tavern-helper-adapter`，让 fake host 可按 message id 读取消息，并将旧 bridge 配置并入初始 config。
- 新增 `app/fixtures/visual-novel/*`、`docs/VISUAL_NOVEL_MIGRATION.md` 与 gate 测试，固定第一阶段兼容基线。
- 当前仍不迁移完整阅读器 DOM、不实现真实 provider 请求、不挂载 `window.VisualNovelBridge` 旧全局别名。

### v0.2.1 - 2026-06-12

- 归档 `plan/v0.2.1-酒馆助手脚本发布打包策划书.md`，明确最终按酒馆助手脚本 JSON 形态发布，参考 `_inbox/酒馆助手脚本-玉子手机.json`。
- 新增 `docs/PACKAGING_WORKFLOW.md`，固定原版 Visual Novel 源路径、IGS 源码路径、`app/dist` bundle、`loader/igs-loader.json` 和发布前验收命令。
- 更新 README、AGENTS、AI_WORKFLOW、RELEASE 与 loader README，要求后续涉及打包发布时先读发布工作流文档。
- 明确当前仍不默认接回奶龙工具箱 `project.json / latest / tavern helper` 发布壳；发布导入件采用独立 loader JSON。
- 新增 `loader/igs-loader.js` 与 `app/scripts/build-loader.js`，可通过 `npm run build:loader` 生成项目内 `loader/igs-loader.json` 供酒馆导入测试。
- `npm run gate` 新增 loader JSON 反解校验，确保 `loader/igs-loader.json.content` 与 `loader/igs-loader.js` 原文一致。

### v0.2.0 - 2026-06-12

- 接通最小运行闭环：`bootstrapIGS()` 负责 host -> scene -> visual -> public API 的基础装配，并挂载 `window.IGS` / `window.ImmersiveGalgameSystem`。
- 新增 `app/src/index.js`、`core/bootstrap.js`、`api/public-api.js`、`host/tavern-helper-adapter.js`、`scene/text-parser.js`，让 fake TavernHelper 消息可以解析为 scene 并渲染到 layer。
- 新增 shujuku 安全包装、资源缓存、导入分发和样式契约检查的最小实现，覆盖 v0.1.5 验收闸门的 P0 模拟链路。
- 新增 `app/package.json` 和 `app/scripts/*`，提供 `npm run structure/static/test/simulate/perf/build/gate`。
- 新增 `app/fixtures/` 分层样例和 `app/tests/` 原生 Node 测试，覆盖输入发送、场景解析、视觉模式、生图请求构建、导入契约、样式契约、fake shujuku 刷新和资源缓存。
- `npm run gate` 已通过：structure、static、test、simulate、perf、build 全部成功；未执行真实酒馆、真实 provider 或安装版实机校验。
- 新增独立 GitHub 上传流程，仓库目标为 `xiagaogaozi/immersive-galgame-system`，上传命令写入 `docs/RELEASE.md` 与 `docs/AI_WORKFLOW.md`。

### v0.1.6 - 2026-06-12

- 新增项目级 `AGENTS.md`，移植 NailongHub 的风险级别、执行清单、防结构腐化、技术债记录和交付说明流程。
- 将 NailongHub 的安装版实机验真要求改写为沉浸式 Galgame 系统的 fixtures 驱动模拟测试策略。
- 新增 `docs/ARCHITECTURE.md`，用模块图和职责表补充 AI 读代码入口。
- 新增 `docs/SCHEMA_AND_FIXTURES.md` 与 `app/src/schemas/CONTRACT.md`，明确跨模块 schema、fixtures 和 `S0-S10` 模拟测试矩阵。
- 更新 README 与 AI 工作流索引，明确本项目仍不走奶龙工具箱发布壳和校验流程。

### v0.1.5 - 2026-06-12

- 新增根目录 `plan/`，用于归档每个版本的策划书 Markdown。
- 归档 `plan/v0.1.5-验收闸门策划书.md`，记录验收闸门建设方案。
- 在修改流程中明确：后续 AI 每次更新版本策划书都必须放入 `plan/`。
- 在 README 中明确本项目不要走奶龙工具箱流程校验。

### v0.1.4 - 2026-06-10

- 新增 NAI provider / request builder 预留骨架。
- 新增 `generated-images/request-builders/`、`prompts/adapters/`、`prompts/schemas/`，为 ComfyUI、GPT 图像、banana 等不同提示词框架保留位置。
- 新增 `docs/IMAGE_GENERATION.md`，明确 Provider、Request Builder、Prompt Adapter、Preset 的边界。
- 补充 `image-request-builder`、`image-request-builder-preset`、`workflow-preset` 导入类型和二创 API 扩展点。

### v0.1.3 - 2026-06-10

- 将 st-chatu8 和 chami 明确为可拆卸内置 `image-provider`，新增默认 provider 骨架。
- 补充 `image-provider-preset`，用于保存 provider 选择器、优先级、轮询和按钮匹配配置。
- 补充 `ui-skin-preset` / `ui-layout-preset`，用于支持全屏字幕式、左上工具栏等完全不同 UI。
- 增加稳定 DOM 槽位、CSS 变量和 `data-igs-*` 设置桥接要求，保证换皮后 `设置 -> 阅读器` 仍能控制关键 UI 配置。

### v0.1.2 - 2026-06-10

- 调整目录为功能总集表反推结构：新增 `loader/`、`app/dist/`、`app/src/media/`、`app/src/data/shujuku/`、`app/src/generated-images/providers/`。
- 将 shujuku 数据层契约从 `app/src/data/CONTRACT.md` 收敛到 `app/src/data/shujuku/CONTRACT.md`。
- 新增 `host/input-channel.js`、`scene/*`、`visual/*` 轻量骨架入口。
- 新增 `docs/MOD_FORMAT.md`、`docs/STYLE_SYSTEM.md`、`docs/RELEASE.md`。
- 明确本结构不走奶龙工具箱发布壳和校验流程。

### v0.1.1 - 2026-06-10

- 对照 `codex resume 019eac50-4ce8-7a93-a80e-8550e4c7666d` 补齐功能总集表中的 Visual Novel 既有细项与旧规划底座。
- 补充 `host`、`actions`、`components`、`data`、`storage`、`prompts` 模块契约。
- 补齐可选组件、动作系统、输入框发送契约、视觉模式、环境效果层、生图提示词引擎、手动重生/轮询/缓存和 Visual Novel 兼容公开 API。
- 补充手机端网页全屏/全屏横屏横版布局、工具栏横排/竖排设置，以及工具栏、对话气泡、名字牌、头像、选项等组件级 CSS 覆盖要求。
- 同步更新能力分组导入、二创 API、预设格式和场景规则文档。

### v0.1.0 - 2026-06-10

- 新建沉浸式 Galgame 系统架构目录。
- 建立 `app/` 主工程模块契约、fixtures 与测试目录说明。
- 建立 `docs/` 下的 AI 工作流、Mod API、预设格式、能力分组导入、场景规则与 shujuku 表格页说明。
- 建立根目录 `功能总集表.md`，汇总 Visual Novel 既有能力、已确认新增目标与 UI 结构。
- 按用户要求移除奶龙工具箱发布壳，只保留已确认的独立架构。
