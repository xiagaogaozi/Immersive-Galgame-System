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
- 当前项目版本 `v0.3.10`：修复远程自动更新 bundle 仍转发到 `app/src` 子模块的问题，确保酒馆加载到的远程文件自包含并包含 `<image>` 图位翻页同步修复。
- `v0.3.10` 已把 dist bundle 自包含固定为回归闸门；`v0.3.9` 已把“第 1 页不能偷显示后续图位图片”“普通 DOM 图片按 `<image>` 顺序填槽并随正文翻页”固定为回归闸门。
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

### v0.3.10 - 2026-06-13

- 修复自动更新链路的实机错位风险：`app/scripts/build.js` 现在会把 `app/src` 模块打成自包含的 `app/dist/igs.bundle.js`，不再发布只有 267 字节、继续 `import ../src/index.js` 的转发入口。
- 这个问题会导致 loader 入口虽然带 cache bust，但浏览器/酒馆仍可能复用未带刷新参数的旧子模块；表现就是本地源码已绑定 `<image>`，酒馆里第 1 页仍显示后段图片，翻正文页时图片页码不跟随。
- 新增 `gate:dist-bundle:is-self-contained-for-loader-cache-bust` 回归闸门：发布产物不得包含运行时 `import`，必须包含当前版本号与 `resolveSegmentImageIndex` 绑定逻辑。
- 当前远程发布文件会直接携带 v0.3.9 的 `<image>` 图位修复，避免旧模块缓存继续把正文第 1 页错绑到最后一张图。

### v0.3.9 - 2026-06-13

- 修复阅读器翻正文时图片页码不变的问题：`reader-host.js` 现在优先使用当前正文段落对应的 `<image>` 图位索引，而不是复用打开阅读器时的旧 `imageState.currentIndex`。
- 修复“第 1 页显示正文最后一张图”的错绑：阅读器不再从当前图位向后偷拿第一张有 URL 的图，当前正文页只显示它绑定的当前图位；未绑定兜底只在数量能和图位一一对应时按同序号使用。
- 修复普通 DOM 图片空索引误判：`dom-image-candidates.js` 不再把缺失的 `data-slot-index / data-image-index` 当成数字 `0`，避免多张普通 `img[src]` 全部写进第 1 个图位。
- `reader-image-service.js` 对 generic DOM 图片收紧首选图位兜底：普通无元数据图片只有数量与 `<image>` 图位相等时才按顺序填槽；单张无元数据普通图不会再冒充第 1 个图位。
- 新增回归测试：只绑定第 6 图位时第 1 页不得显示第 6 图；6 张普通 DOM 图必须按 `<image>` 顺序填槽，点下一段后背景从第 1 图切到第 2 图。
- 本轮已通过 `npm run test`、`npm run simulate`、`npm run gate`、`npm run build:loader` 与 loader JSON 反解校验。

### v0.3.8 - 2026-06-13

- 优化自动更新 loader 的入口体感速度：`loader/igs-loader.js` 现在会在远程 `igs.bundle.js` 下载完成前先向酒馆魔法棒菜单注入临时入口；正式 IGS 运行时加载完成后，`createMagicWandEntry()` 会清理该临时入口并替换为正式入口。
- 默认 `@main` 加载路径不再额外做一次 HEAD 探测，减少一次远程请求；手动指定旧 tag、测试分支或自定义 base 时仍保留探测和 `@main` fallback，避免坏 ref 直接弹失败框。
- 修复截图同类图片黑屏问题：`dom-image-candidates.js` 现在会在楼层范围内识别普通 `img[src] / img[data-src]`，并过滤明显的头像/宿主装饰图；`reader-host.js` 在当前 `<image>` 图位暂未绑定 URL 时，会用已扫到的未绑定插图或 `currentUrl` 兜底显示，不再只显示黑底。
- 新增回归测试：loader 在远程 bundle 未完成前必须先显示临时魔法棒入口；含 `<image>` 图位且楼层只有普通图片节点时，阅读器必须显示该图片为背景。
- 本轮已通过 `npm run test`、`npm run simulate`、`npm run gate`、`npm run build:loader` 与 loader JSON 反解校验。

### v0.3.7 - 2026-06-13

- 修复自动更新 loader 的发布逻辑：`loader/igs-loader.js` 默认 ref 改为 `main`，直接加载 `https://cdn.jsdelivr.net/gh/xiagaogaozi/immersive-galgame-system@main/app/dist/igs.bundle.*` 并加 cache bust，不再通过 manifest 推导 `v<version>`。
- 保留手动锁版本能力：用户仍可通过 `window.IGS_LOADER_REF` 或 `window.IGS_LOADER_CONFIG.ref` 指向旧 tag、`main` 或测试分支；非 `main` ref 探测失败时会继续 fallback 到 `@main`。
- 更新 `app/tests/gate-contract.test.js`，新增默认不读 manifest、默认加载 `@main`、固定 ref 404 后回退 `@main` 的 VM 回归测试，并防止 `DEFAULT_REF` 再被写回 `vX.Y.Z`。
- `docs/PACKAGING_WORKFLOW.md`、`docs/RELEASE.md` 与 `loader/README.md` 已同步改写发布说明；`app/package.json`、运行时版本、阅读器版本显示与构建产物同步提升到 `v0.3.7`。
- 本轮已通过 `npm run test`、`npm run simulate`、`npm run gate`、`npm run build:loader` 与 loader JSON 反解校验。

### v0.3.6 - 2026-06-13

- 按 `plan/v0.3.6-image标签图位绑定与图片轮询修复施工图.md` 新增 `app/src/scene/image-slots.js`，把 `<image>` 与 `image###...###` 解析成稳定图位，并为阅读器正文段落补齐“段落对应图位”的映射数据。
- `app/src/scene/message-source.js`、`app/src/api/visual-novel-compat.js` 与 `app/src/visual/visual-novel-ui/reader-host.js` 现已统一使用清理后的阅读正文分页，不再把 `[角色: ...]` 或图片占位行当成独立页面，同时保留原版“一行多句同页、单换行分段”的阅读节奏。
- `app/src/generated-images/reader-image-service.js`、`provider-runtime.js`、`message-image-cache.js`、`dom-image-candidates.js` 与宿主/Provider 适配层现已在收图、轮询、重绘和缓存时保留 `slotIndex / locationHash / imageId` 元数据，修复“第三张图跑到第一张位置”“点重绘后又退回扫描顺序”的问题。
- `app/tests/unit.test.js` 与 `app/tests/simulate.test.js` 新增 `<image>` 图位顺序、段落到图位映射、第三段绑定第三张图、重绘后仍停留原图位，以及关闭图位绑定时回退旧扫描顺序的回归闸门；本轮已同步通过 `npm run test`、`npm run simulate`、`npm run gate` 与 `npm run build:loader`。

### v0.3.5 - 2026-06-13

- 按 `plan/v0.3.5-原版VN剩余重构审计与补全策划书.md` 补齐原版 VN 剩余重构缺口：新增 `app/src/generated-images/image-api-client.js`、`dom-image-candidates.js` 与 `providers/dom-generic-provider.js`，把原版的模型读取、真实 NAI 生图、DOM 插图探测和通用外部适配收口到 `generated-images` 运行时。
- `app/src/generated-images/providers/nai-provider.js`、`provider-runtime.js`、`reader-image-service.js` 与 `app/src/core/bootstrap.js` 现已打通真实 `fetchImageModels` / `testImageApi` / `generateImage` / `regenerate` / `save` 链路，不再用占位结果伪装原版 VN 的图像设置页。
- `app/src/host/tavern-helper-adapter.js` 与 `app/src/visual/visual-novel-ui/reader-host.js` 补回隐藏楼层 `hide_state` 兜底、`SillyTavern.getContext()` fallback、iframe `data-src` 图片源扫描、重绘按钮定位和版本同步，确保原版阅读器在更多宿主环境下仍可打开最新楼层并读取插图。
- `app/tests/unit.test.js`、`app/tests/simulate.test.js` 与 `app/tests/gate-contract.test.js` 扩展了 NAI zip/base64 返回、图像设置页真实调用、外部适配过滤、iframe 探测、隐藏楼层跳转与 SillyTavern context fallback 的回归闸门；本轮已同步重建 `app/dist/manifest.json` 与 `loader/igs-loader.json`，并通过 `npm run test`、`npm run simulate`、`npm run gate` 与 `npm run build:loader`。

### v0.3.4 - 2026-06-13

- 按 `plan/v0.3.3-原版VN分页拖拽与AI楼层修复施工图.md` 完成运行时代码修复：`buildTextSegments()` 现已对齐原版 VN 的按 `\n+` 分段语义，一行多句保持单页，单换行多段拆成多页。
- `app/src/visual/visual-novel-ui/reader-host.js` 补回 PC/手机浮窗拖拽、`6px` 阈值、`8px` viewport clamp、拖后 `120ms` click 抑制，并在重渲染与 resize/orientation 后保留用户拖动位置。
- `app/src/host/tavern-helper-adapter.js` 与 `app/src/core/bootstrap.js` 现已统一跳过用户层、系统层和隐藏层；`prev-turn` / `next-turn` 在 fallback `listMessages()` 链路下也会继续按 AI-only 语义移动。
- `app/src/visual/visual-novel-ui/original-reader-source.js`、`settings-style.js` 与相关 fixtures/tests 已补齐浮窗滚动、拖拽态、controls 固定和四模式按钮省略显示契约；本轮已通过 `npm run test`、`npm run simulate`、`npm run gate` 和 `npm run build:loader`。

### v0.3.3 - 2026-06-13

- 新增 `plan/v0.3.3-原版VN分页拖拽与AI楼层修复施工图.md`，将当前发现的 VN parity 差异固化为可执行施工图。
- 施工图明确下一轮需要修复：一段一页分页、PC/手机浮窗拖拽、上一轮/下一轮跳过用户层、浮窗长文本滚动、四模式选择器文字溢出。
- 本版本是计划归档回退点，不包含运行时代码修复；实现轮需要重新核对施工图列出的源码位置并运行 `npm run gate` 与 `npm run build:loader`。

### v0.3.2 - 2026-06-13

- 修复自动更新 loader 在 jsDelivr `@v<version>` 标签资源短时返回 404 时直接弹出“远程脚本加载失败”的问题；本轮实际探测到 GitHub raw 的 `v0.3.1` bundle 可访问，但 jsDelivr `@v0.3.1/app/dist/igs.bundle.js` 返回 404。
- `loader/igs-loader.js` 现在会用 raw GitHub manifest 解析版本后，先探测 jsDelivr tag bundle；如果 tag bundle 不可用，会自动 fallback 到 jsDelivr `@main` 并加 cache bust，避免刚发布标签时测试入口打不开。
- 扩展 `app/tests/gate-contract.test.js`：新增 VM 回归测试，模拟 manifest 返回 `0.3.2`、版本 tag 探测 404，要求 loader 不弹窗并改用 `@main/app/dist/igs.bundle.js`。
- `app/package.json`、`app/src/core/bootstrap.js`、阅读器默认版本、`app/dist/manifest.json` 与 `loader/igs-loader.json` 同步提升到 `v0.3.2`。

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
