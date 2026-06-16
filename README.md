# Visual Novel

JS-Slash-Runner（酒馆助手）Visual Novel 项目。

## 当前定位

- 显示名：Visual Novel
- 内部代号：VN
- 全局对象：`window.VN`
- 完整对象：`window.VisualNovel`
- CSS 前缀：`.vn-`
- DOM 属性：`data-vn-*`
- 存储前缀：`vn:*`
- Mod 后缀：`.vn-mod.js`
- 预设后缀：`.vn-preset.json`
- 资源包后缀：`.vn-pack.json`

## 当前状态

- 阶段：最小闭环已接通
- 形态：独立 app 工程，已有 Node 原生测试与验收闸门
- 当前项目版本 `v0.8.0`：修复切轮全屏抖动、立绘拖动反向、全屏隐藏后无法恢复、状态行开关、上一轮落点。
- `v0.7.7` 修复全屏模式点击退出 + 立绘位置按角色独立存储。
- `v0.6.1` 修复混合模式下生图占据所有段落的问题，生图只绑定 `<image>` 标签前一段正文。
- `v0.6.0` 图片绑定精确化（移除激进兜底、chatu8 按 DOM 顺序绑定 slot）、混合模式生图与场景素材分区。
- `v0.5.4` 修复立绘保存后缩回、移除拖拽限制。
- `v0.3.19` 修复 `<image>` 图位绑定、图片进度、外部重绘按钮和阅读器常驻隐藏按钮。
- `v0.3.13` 已把“只扫当前楼层 + 占位绑定 + 楼层外图片隔离”固定为回归闸门；`v0.3.12` 已把 commit-first 自动更新固定为回归闸门；`v0.3.10` 已把 dist bundle 自包含固定为回归闸门。
- 当前不保留奶龙工具箱发布壳，不走奶龙工具箱流程校验。
- 保留独立 `loader/` 目录，用于后续 GitHub 远程 bundle 自动更新入口。
- 最终酒馆导入形态：`loader/酒馆助手脚本-Visual Novel（自动更新） v0.5.1.json`；`loader/vn-loader.json` 保留为固定内部入口和自动化校验基准。
- 原版 Visual Novel 脚本来源：`D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\Visual Novel 原版备份`。
- 策划书版本归档目录：`plan/`
- 项目级 AI 工作流入口：`AGENTS.md`
- 当前验收策略：`npm run gate`，fixtures 驱动的模拟测试，不要求安装版实机校验。
- GitHub 仓库：`https://github.com/xiagaogaozi/Visual-Novel`

## 项目目标

本项目目标是把原 Visual Novel 脚本升级为一个可扩展的 Visual Novel 运行时：

- 继续保留 Visual Novel 已有的阅读器、魔法棒入口、正文解析、图像 API、外部插图扩展适配和移动/桌面阅读模式。
- 使用 GitHub 远程 bundle 发布主程序，酒馆内只导入小型自动更新 loader。
- 建立能力分组导入系统，不提供独立总 Mod 管理页；生图插件、选项组件、UI 预设、背景/立绘资源、正文正则预设都在各自页面管理。
- 建立 `Mod / Preset / Pack` 三层边界：Mod 扩展代码能力，Preset 切换配置，Pack 管理背景、立绘、头像和本地持久资源。
- 提供 shujuku 表格可编辑前端，但不重复 shujuku 自带的模板导入能力。
- 提供 AI 友好的模块契约、fixtures、模拟测试与工作流，方便后续由 AI 逐步实现。

## 目录约定

```text
projects/Visual Novel/
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

本项目当前绕过奶龙工具箱发布项目结构，只保留已确认的 Visual Novel 架构：

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

### v0.8.0 - 2026-06-16

- 修复全屏模式下点上/下一轮在全屏↔网页全屏来回切换：`closeReader` 新增 `keepFullscreen` 参数，`openReader` 内部切层时不退出全屏，仅用户点关闭按钮才退出。
- 修复编辑立绘位置时拖动方向相反（四个模式）：`sprite-edit.js` 拖动公式从 `-` 改为 `+`，立绘跟随光标移动。
- 修复全屏模式隐藏对话框后点击无法恢复：移除全屏 runtime 对 `#vn-click-layer` 的 `pointer-events:none`（该 workaround 在 v0.7.9 根治退出问题后已多余）。
- 修复显示状态行开关无效：`.vn-status-line` 显示时用 `display:block` 覆盖 CSS 默认 `display:none`。
- 修复点击上一轮落在上一轮最后一页：`moveReaderTurn` 的 `startAtEnd` 改为恒 `false`，上/下一轮都从第一页开始。

### v0.7.9 - 2026-06-16

- 立绘缩放范围从 50%~300% 放宽至 -500%~500%（滚轮和双指缩放两处 clamp 同步修改），支持大尺寸立绘缩小及镜像翻转。
- 修复全屏模式点击即退出：根因是每次翻页 `hydrateReaderMount` 重建 `#vn-overlay`，导致 runtime cleanup 调用 `exitFullscreen()` 进而触发自动关闭。现移除 runtime cleanup 的自动退出和 `fullscreenchange` 的自动关闭逻辑，浏览器全屏状态不再联动阅读器。
- 退出浏览器全屏的时机改为：仅「点击关闭按钮」（`closeReader`）或「切换到非全屏模式」时调用 `exitDocumentFullscreen`。

### v0.7.8 - 2026-06-16

- 重构：拆分 `app/src/visual/visual-novel-ui/reader-host.js` 巨型模块，从 3619 行降到 1486 行，行为零改变。
- 新增 10 个子模块：`reader-host-constants.js`（常量 + 提示词模板）、`reader-value-utils.js`（纯值工具）、`settings-fields.js`（表单控件 HTML）、`reader-image-state.js`（图片状态归一化）、`reader-dom-utils.js`（DOM 工具）、`settings-normalize.js`（归一化/主题）、`settings-actions.js`（场景素材增删改查）、`sprite-edit.js`（立绘编辑）、`reader-runtime.js`（模式运行时）、`reader-dom-render.js`（快照渲染）。
- 有状态子模块改为「传入上下文」形式，不再依赖闭包；删除死代码 `escapeRegExp`。全部 58 单测 + 38 模拟测试保持通过。

### v0.7.7 - 2026-06-16

- 修复全屏模式点击即退出：`#vn-click-layer` 在全屏模式下设为 `pointer-events:none`，不再拦截工具栏和 dialog 的点击事件。
- 修复编辑立绘位置影响其他角色：`spriteLayouts` 从单纯按模式存储改为 `mode::character` 复合 key，每个角色在每个模式下独立存储位置。查找时优先匹配角色专属 key，回退到模式通用 key（兼容旧数据）。

### v0.7.6 - 2026-06-16

- 修复角色名到气泡顶部边距未生效：根因是 `.vn-dialog` 的 `padding-top: 22px` 和 `.vn-progress` 的 `margin-bottom: 10px` 叠加。场景模式有 speaker 时动态将 dialog padding-top 缩为 10px；progress margin-bottom 清零。
- 修复自定义模式分隔线颜色默认黑色：切换到自定义模式时，用上一个预设的全部字段值填充自定义字段，避免残留旧值（如 minimal 的暗色）。

### v0.7.5 - 2026-06-16

- 修复调色盘点击即消失：对 `type="color"` 输入改为只监听 `change` 事件（关闭调色盘时才更新），跳过 `input` 实时事件避免 DOM 重建导致弹窗销毁。
- 修复自定义模式分隔线消失：`resolveActiveTheme` 的 custom 分支对 `dividerSymbol` 用 `!= null` 判断而非 `||`，保留用户选择的 'none' 或任意值。
- 间距进一步收紧：角色名 `margin-top:1px; margin-bottom:1px`，分隔线 `margin-bottom:2px`。
- 设置面板分组卡片布局：角色名/台词/心里话/分隔线各成一组，字体和颜色并排显示。
- 调色盘色块预览：`input[type="color"]` 添加 42×36px 独立样式，直接展示当前选中颜色。

### v0.7.4 - 2026-06-16

- 默认预设改为原神风（之前默认极简模式分隔线为 'none' 导致不显示）。
- 缩小角色名与分隔线之间间距（2px）、分隔线与台词之间间距（4px），贴近原神对话 UI 效果。
- 修复 `normalizeVnTheme` 中 `nameAlign` 的 fallback 逻辑。

### v0.7.3 - 2026-06-16

- 修复角色名和分隔线不显示：CSS 默认 `display:none`，需要用 `display:block` 覆盖而非空字符串。
- 颜色选项改为浏览器原生调色盘（`<input type="color">`），不再需要手动输入色值。
- 新增角色名字体、台词字体、心里话字体三个下拉选择框（楷体/黑体/仿宋/微软雅黑）。
- 主题预设颜色统一改为 hex 格式以兼容调色盘。

### v0.7.2 - 2026-06-16

- 修复角色名未从 `@vn-scene` directive 提取：`resolvedSpeaker` 现在从 `resolveSceneStateAtIndex().character` 获取，不再依赖外部 payload 的 `scene.speaker` 字段。
- 修复 `displayText` 计算顺序错误导致 `ReferenceError`：将 `displayText` 构建移至 scene directive 解析之后。
- 设置面板中非自定义预设时，字段值现在反映所选预设的实际配置。

### v0.7.1 - 2026-06-16

- 修复场景模式下角色名未展示：virtualRegex 格式化后的 `[speaker]: text` 前缀现在会被正确剥离，角色名移至独立 `.vn-speaker` 元素显示。
- 修复设置面板预设值显示错误：选择非自定义预设时，下方字段现在正确反映所选预设的值而非存储的旧值。

### v0.7.0 - 2026-06-16

- 新增角色姓名展示：场景模式下在气泡顶部显示角色名，支持左对齐/居中。
- 新增分隔线：角色名与台词之间可选装饰分隔线（◇/✦/══/渐变/无）。
- 新增心里话样式：`*...*` 包裹的文本以独立颜色/字体渲染。
- 新增对话主题系统：预设（原神风/崩铁风/极简）+ 自定义模式，可调角色名/台词/心里话/分隔线的字体与颜色。
- 状态行改为可选：阅读器设置中新增开关（默认关），开启后在气泡外顶部左对齐显示段落进度。

### v0.6.2 - 2026-06-16

- 修复混合模式数据源：从 `extracted.segmentImageSlots` 读取段落映射而非 `payload.segmentImageSlots`（payload 在实际运行时可能为空）。
- 场景素材启用时非生图段落主动清空背景：不再继承 `displayImageState.displayUrl` 的生图 URL，确保非生图段落不显示生成图。

### v0.6.1 - 2026-06-16

- 修复混合模式分区：重写 `buildSceneAssetsMapping`，只把紧挨 `<image>` 标签前方的段落标记为生图段落，其余段落正确返回 null 走场景素材查表。
- 修复 `Number(null)=0` 误判：snapshot 构建时用 `!= null` 严格区分 null 段落和 slot 0 段落。

### v0.6.0 - 2026-06-16

- 图片绑定精确化：移除 `orderedSlotFill` 和 `preferredSlotFallback` 兜底逻辑，只保留精确匹配（slotIndex / locationHash / imageId），无身份标识的图片进入 unboundImages 而非猜测绑定。
- chatu8 按 DOM 顺序绑定 slot：利用 chatu8 原地替换 `<image>` 标签的特性，按 DOM 文档顺序赋 slotIndex，修复图片顺序错乱问题。
- 混合模式生图与场景素材分区：生图（已绑定 slot 的图片）独占对应段落背景且不叠立绘，其余段落走场景素材查表显示背景+立绘。

### v0.5.1 - 2026-06-15

- 立绘编辑框占满阅读器：进入编辑模式时 `#vn-sprite` 临时扩展为全屏，拖动区域更大、虚线框覆盖整个阅读区。
- 各模式立绘位置独立：新增 `spriteLayouts` 字段按 `pc / mobile / web / fullscreen` 分别存储焦点与缩放，切换模式互不影响。
- 设置按钮禁止隐藏：`normalizeHiddenButtons` 强制过滤 `settings`，按钮管理 UI 中设置行的眼睛按钮置灰不可点。
- 版本升级自动重置阅读器配置：`readerSettings` 新增 `_v` 版本戳，加载时若存储版本不匹配当前版本则丢弃旧配置回到默认值，防止旧配置（含隐藏按钮）污染新版本。
- 取消默认常驻隐藏对话框按钮：`DEFAULT_PINNED_TOOLBAR_BUTTONS` 改为空数组。

### v0.5.0 - 2026-06-15

- 立绘直接编辑模式：工具栏新增"调整立绘位置/大小"按钮，点击后进入原地编辑；单指/鼠标拖动平移焦点，滚轮/双指捏合调整缩放（50%–300%），操作栏提供「还原」「取消」「保存」三键。
- 修复竖向立绘过小：`#vn-sprite` 的 `background-size` 从 `contain` 改为 `100%`，竖图不再被高度约束压缩，默认显示底部（`background-position: 50% 100%`）。
- 新增 `spritePosX / spritePosY / spriteScale` 三个 `readerSettings` 字段，持久化保存调整结果。

### v0.4.9 - 2026-06-15

- 修复立绘层实际不可见：当 `snapshot.content.spriteImage` 存在时，阅读器宿主现在明确把 `#vn-sprite` 的 `display` 设为 `block`，不再回落到原版 CSS 的 `display:none`。
- 新增回归验证：场景素材背景和立绘同时存在时，不只断言 `spriteImage` 字段，还断言阅读器 HTML 中 `#vn-sprite` 已切换为可见显示状态。
- 验证边界：本轮继续使用 fake TavernHelper / fake DOM / fixtures 与 Playwright 运行态证据定位，不写入真实 shujuku，不调用真实图像 provider。

### v0.4.8 - 2026-06-15

- 修复场景素材立绘不显示：`@vn-scene` 现在记录对应的阅读器段落索引，场景状态只继承当前段落之前的角色/情绪/场景，不再被后文角色标签污染。
- 修复阅读器立绘层缺失：原版阅读器模板补回 `#vn-sprite` 节点，并保留背景图与角色立绘同时渲染；已有背景图不再强制清空 `spriteImage`。
- 新增回归验证：覆盖当前段落场景状态继承、已有背景图时仍保留立绘、阅读器模板必须包含 `#vn-sprite`。
- 验证边界：本轮仍使用 fake TavernHelper / fake DOM / fixtures 做模拟验证，不写入真实 shujuku，不调用真实图像 provider。

### v0.4.7 - 2026-06-15

- 修复场景注入提示词不生效：`prompt-injector.js` 现在优先走 SillyTavern `setExtensionPrompt`，明确写入 `IN_PROMPT = 0`，并在写入后校验 `extensionPrompts` 中的内容和 position。
- `bootstrap.js` 为场景素材注入增加失败重试，避免启动时 SillyTavern context / TavernHelper 尚未完全就绪时静默失败。
- 修复场景素材不显示的配置容错：背景和情绪资源优先精确匹配，其次 `默认`，最后在只有一个非空素材时作为兜底使用，兼容用户只配置 `场景1` 或单个情绪图的情况。
- 新增回归测试覆盖 prompt 注入 position、清理注入 key、单素材兜底匹配，以及从 legacy storage 启动后渲染场景素材的模拟闭环。
- skipped：本轮不生成新版酒馆导入 JSON、不做真实 provider/shujuku 写入；按项目规则以 Node 模拟测试和 dist build 作为验收。

### v0.4.6 - 2026-06-15

- 修复提示词注入不生效：`syncSceneAssetsInjection` 延迟 3 秒执行，等待 TavernHelper 初始化完成后再调用注入 API。
- 修复 `prompt-injector.js` 查找路径：增加 `globalThis` 和 `window` 查找 TavernHelper/SillyTavern，不再只依赖传入的 `globalObject`。
- 注入 position 改为 `in_prompt`（系统提示区域），避免被过长的聊天上下文截断。
- 版本号同步 bootstrap.js / package.json / tests。

### v0.4.3 - 2026-06-15

- 修复场景素材不显示：DEFAULT_VIRTUAL_REGEX 改为贪婪匹配 `[台词]` 方括号内容，兼容 `@vn-scene` 四段和 `@bubble` 三段。
- `resolveSceneStateAtIndex` 不再用 lineIndex 裁剪，整楼层累积所有 directives 得到最终场景状态。
- 场景素材显示逻辑（仅 `sceneAssets.enabled` 时生效）：有扫描图的段显示扫描图不叠立绘，无扫描图的段显示素材背景+立绘。未启用时完全不影响正常图片轮询。

### v0.4.1 - 2026-06-15

- `@vn-scene` 格式改为四段式：`@vn-scene:角色名|情绪|场景名|[台词]`。
- `scene-directives.js` 改为只读提取（不删除行，交给 regex 处理显示）。
- DEFAULT_VIRTUAL_REGEX 改为同时匹配 `@vn-scene`（四段）和 `@bubble`（三段）。
- DEFAULT_SCENE_PROMPT_RULE 重写为 v7.1 风格硬措辞（18 条规则 + 完整示例）。
- 设置面板背景名/角色名/情绪名旁加 SVG 铅笔重命名按钮（prompt 弹窗）+ SVG 垃圾桶删除按钮。

### v0.4.0 - 2026-06-15

- 新增「场景素材」模式：通过 `@vn-scene:` 标签驱动背景图和立绘切换。
- 新增 `scene-directives.js`：提取/解析 @vn-scene 标签，查表返回背景/立绘 URL。
- 新增 `prompt-injector.js`：向 AI 注入场景标注格式规范（TavernHelper.injectPrompts → setExtensionPrompt 降级）。
- `message-source.js`：在 virtualRegex 前提取 sceneDirectives，附带到 payload。
- `image-slots.js`：sceneAssetsMode 下每张扫描图只绑前一段正文。
- `reader-host.js`：#vn-sprite 层 + 背景/立绘 fallback + 场景 tab UI + action handlers（增删改条目）。
- `original-reader-source.js`：#vn-sprite CSS（居中底部 40%×85%）。
- `settings-tabs.js`：新增 scene tab 模板。
- `bootstrap.js`：promptInjector 生命周期（启动/保存/销毁）。

### v0.3.23 - 2026-06-15

- 新增 rescan 操作加载转圈动画（collect 前显示 spinner，完成后移除）。
- rescan 使用 skipCache 跳过过期 blob URL 缓存。
- 新增 hiddenBtns 设置，支持隐藏工具栏按钮。
- 替换常驻按钮简单切换为完整按钮管理器 UI（☰ 排序 / 眼睛显隐 / 星常驻）。
- 新增 btnOrder 设置字段，toolbar-move-up 实际交换排序。
- 隐藏的按钮自动解除常驻，applyToolbarState 尊重 hiddenBtns 和 btnOrder。
- 移除 normalizePinnedButtons 的空值强制回退。
- 设置面板按钮管理操作后保持滚动位置。

### v0.3.22 - 2026-06-14

- 过滤 chami 未加载占位图：`dom-image-candidates.js` 新增 `isUnloadedPlaceholderImage`，跳过 `data-is-loaded="false"` 或 URL 为已知 1x1 透明 gif 的 IMG 节点，避免占位图污染候选池并触发 `uniqueImages` 错误去重。
- 新增"刷新图位"工具栏按钮（`rescan`）：手动触发重新扫描当前楼层图片，用于 chami 异步加载完成后刷新绑定。图标为圆形箭头（↻），与"重新生成背景图"的画笔图标区分。
- 调整"重新生成背景图"按钮图标为画笔/魔法棒样式，更符合"AI 重绘"语义。
- 增大轮询窗口：默认轮询次数从 8 次增加到 20 次，间隔从 250ms 增加到 500ms（总窗口从 2 秒增加到 10 秒），给 chami 更多异步加载时间。

### v0.3.21 - 2026-06-14

- 修复 chami 图片绑定错位：所有图位显示同一张图（第 6 张），正文前 5 张图全部丢失。
- 根因：`dom-image-candidates.js` 的 `nodePathKey` 使用 `Array.isArray(parent.children)` 判断子节点列表，但 DOM 的 `parent.children` 是 `HTMLCollection` 而非 Array，该检查永远为 false，导致 `index` 始终为 0。
- 所有 `.tsp-image-slot` SPAN 各自在独立 `<P>` 中且都是第 0 个子元素 → `nodePathKey` 返回完全相同的路径 → `imageCandidateGroupKey` 产生相同的 `slot:` key → `grouped` Map 后入覆盖前入，只保留最后一张。
- 修复：将 `Array.isArray(parent.children)` 替换为 `parent.children && parent.children.length != null`，并使用 `Array.prototype.indexOf.call` 正确查找元素在兄弟节点中的位置。

### v0.3.20 - 2026-06-14

- 修复 chami 等外部 provider 图片始终显示"当前图位未生成"的问题：根因是轮询时 `message.element` 指向被酒馆重建后脱离 DOM 的旧节点，导致 provider 扫描范围为空、收集不到任何图片。
- `reader-image-service.js` 新增 `isDetachedElement` 检测和 `refreshMessageElement` 自动刷新：当 `requireMessageScope` 为 true 且初始 scope 失败或 element 已脱离文档时，自动通过 `hostAdapter.getMessageById` 重新获取最新 DOM 引用后重试 scope 解析。
- `reader-host.js` 轮询时显式传入 `messageId`，确保 service 层在 message 引用失效时仍可通过 id 重查 DOM。
- 保留 v0.3.19 的"单张无标记图片不得绑定第一图位"设计（`applyOrderedSlotFill` 仍要求 >= 2 张有序候选才执行顺序填充）。

### v0.3.19 - 2026-06-13

- 修复 `<image>` 图位绑定：存在正文图位时，单张无编号外部图片不再自动冒充当前图位，避免最后一张图显示成第一张；只有明确图位、位置标记、图片数量完全对齐，或用户点击当前页重绘后出现的新图，才会绑定到对应图位。
- 修复阅读器图片进度：有 `<image>` 图位时进度改为显示“当前图位/已绑定数量/未匹配数量”，不再用 `[1/6 图]` 表示并不存在的已绑定图片。
- 修复“重新生成背景图”对普通外部按钮无响应的问题：当前楼层内带“生成图片、重新生成、重绘、regen”等文字或属性的按钮会被识别，并在重绘后把新图绑定回当前图位。
- 修复阅读器常驻按钮体验：隐藏按钮默认常驻，常驻按钮点亮样式增强；“图像显示模式”现在会实际切换背景 `cover / contain` 显示。
- 新增回归验证：单张无标记图片不得绑定第一图位、普通“生成图片”按钮可重绘当前图位、每个 `<image>` 注入独立占位、常驻隐藏按钮默认可见。

### v0.3.18 - 2026-06-13

- 修复魔法棒入口扫描的自删自建循环：入口扫描现在只清理版本不匹配、位置不正确或形状异常的 `data-vn-*` 菜单项，不再把当前正式入口当作旧入口无条件删除。
- 新增回归验证：重复执行 `ensureMagicWandEntry()` 时必须复用同一个菜单节点，避免 DOM 监听器在酒馆初始化期被反复触发。
- 发布产物同步提升到 `v0.3.18`，自动更新 loader 仍按 GitHub `main` 最新提交拉取远程 bundle。

### v0.3.17 - 2026-06-13

- 统一内部命名空间：内部代号、公开全局对象、CSS 前缀、DOM 属性、存储前缀、Mod/Preset/Pack 后缀均切换为 `VN` / `vn` 体系。
- 发布链路同步切换为 `app/dist/vn.bundle.js`、`app/dist/vn.bundle.css`、`loader/vn-loader.js` 与 `loader/vn-loader.json`。
- 最终导入件固定为 `loader/酒馆助手脚本-Visual Novel（自动更新） v0.3.17.json`，loader 继续从 GitHub `main` 最新提交加载远程 bundle。

### v0.3.14 - 2026-06-13

- 同步原版参考路径：活文档、AI 工作流、发布说明和 Visual Novel UI 契约中的原版来源目录已改为 `projects/Visual Novel 原版备份`。
- 统一 Visual Novel 对外形态：项目目录、魔法棒入口、运行时公开名、dist manifest 和用户可见导入文件均使用 `Visual Novel`。
- 最终导入件固定为 `loader/酒馆助手脚本-Visual Novel（自动更新） v<当前版本>.json`；`loader/vn-loader.json` 继续作为固定内部入口和自动化校验基准。

### v0.3.13 - 2026-06-13

- 按 `plan/v0.3.13-原版VN安全楼层取图与image占位绑定施工图.md` 收紧原版 VN 兼容取图范围：`reader-image-service.js` 现已在存在 `<image>` 图位时强制要求当前楼层作用域，找不到当前楼层根时直接返回空图位，不再退回整页扫描。
- `dom-image-candidates.js` 修复了隐藏的整页漏扫入口：即使已经拿到当前消息根，provider 也不会再偷偷把 `document` 加回扫描列表；普通 `img[src]` 只有在当前 `.mes_text` 内时才允许参与图位绑定。
- `tavern-helper-adapter.js` 新增当前楼层 `<image>` 占位注入与复用逻辑，`message-source.js` 同步忽略这些隐藏占位文本，确保正文分页不被占位节点污染。
- 扩展 Node 模拟酒馆测试：新增“楼层外角色卡图不得混入当前 `<image>` 图位”“当前楼层第三图位重绘仍锁定第三图位”“占位节点只注入当前 `.mes_text`”等回归场景。

### v0.3.12 - 2026-06-13

- 强化自动更新链路：`loader/vn-loader.js` 默认读取 GitHub API `branches/main`，拿到当前 `main` 提交哈希后加载 `https://cdn.jsdelivr.net/gh/...@<commit>/app/dist/vn.bundle.*`，避免 raw manifest 缓存仍停在旧版本、jsDelivr 新标签短时 404 或 `@main` 分支文件继续吐旧入口。
- 保留兜底：GitHub API 不可用时仍回退 `@main`，手动指定 `window.VN_LOADER_REF` 或自定义 base 的行为不变。
- 更新 loader VM 回归测试：默认加载必须使用 GitHub API 返回的 40 位提交哈希，确保酒馆端实际拿到的就是当前提交里的自包含 bundle。

### v0.3.11 - 2026-06-13

- 修复 jsDelivr `@main` 分支缓存继续返回旧 267 字节入口的问题：`loader/vn-loader.js` 现在默认先读取 `raw.githubusercontent.com/.../main/app/dist/manifest.json`，从最新 manifest 得到 `vX.Y.Z` 后优先加载 `https://cdn.jsdelivr.net/gh/...@vX.Y.Z/app/dist/vn.bundle.*`。
- 保留自动更新：以后发布新版本只需要更新仓库 `main` 的 manifest 和打版本标签，loader 不需要再手改内置版本号；manifest 或版本标签不可用时才回退 `@main`。
- 更新 loader VM 回归测试：默认加载必须先走 manifest 指向的版本标签，坏固定 ref 仍能 fallback，避免酒馆端继续吃 `@main` 旧缓存导致 `<image>` 绑定修复不生效。

### v0.3.10 - 2026-06-13

- 修复自动更新链路的实机错位风险：`app/scripts/build.js` 现在会把 `app/src` 模块打成自包含的 `app/dist/vn.bundle.js`，不再发布只有 267 字节、继续 `import ../src/index.js` 的转发入口。
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

- 优化自动更新 loader 的入口体感速度：`loader/vn-loader.js` 现在会在远程 `vn.bundle.js` 下载完成前先向酒馆魔法棒菜单注入临时入口；正式 VN 运行时加载完成后，`createMagicWandEntry()` 会清理该临时入口并替换为正式入口。
- 默认 `@main` 加载路径不再额外做一次 HEAD 探测，减少一次远程请求；手动指定旧 tag、测试分支或自定义 base 时仍保留探测和 `@main` fallback，避免坏 ref 直接弹失败框。
- 修复截图同类图片黑屏问题：`dom-image-candidates.js` 现在会在楼层范围内识别普通 `img[src] / img[data-src]`，并过滤明显的头像/宿主装饰图；`reader-host.js` 在当前 `<image>` 图位暂未绑定 URL 时，会用已扫到的未绑定插图或 `currentUrl` 兜底显示，不再只显示黑底。
- 新增回归测试：loader 在远程 bundle 未完成前必须先显示临时魔法棒入口；含 `<image>` 图位且楼层只有普通图片节点时，阅读器必须显示该图片为背景。
- 本轮已通过 `npm run test`、`npm run simulate`、`npm run gate`、`npm run build:loader` 与 loader JSON 反解校验。

### v0.3.7 - 2026-06-13

- 修复自动更新 loader 的发布逻辑：`loader/vn-loader.js` 默认 ref 改为 `main`，直接加载 `https://cdn.jsdelivr.net/gh/xiagaogaozi/Visual-Novel@main/app/dist/vn.bundle.*` 并加 cache bust，不再通过 manifest 推导 `v<version>`。
- 保留手动锁版本能力：用户仍可通过 `window.VN_LOADER_REF` 或 `window.VN_LOADER_CONFIG.ref` 指向旧 tag、`main` 或测试分支；非 `main` ref 探测失败时会继续 fallback 到 `@main`。
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
- `app/tests/unit.test.js`、`app/tests/simulate.test.js` 与 `app/tests/gate-contract.test.js` 扩展了 NAI zip/base64 返回、图像设置页真实调用、外部适配过滤、iframe 探测、隐藏楼层跳转与 SillyTavern context fallback 的回归闸门；本轮已同步重建 `app/dist/manifest.json` 与 `loader/vn-loader.json`，并通过 `npm run test`、`npm run simulate`、`npm run gate` 与 `npm run build:loader`。

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

- 修复自动更新 loader 在 jsDelivr `@v<version>` 标签资源短时返回 404 时直接弹出“远程脚本加载失败”的问题；本轮实际探测到 GitHub raw 的 `v0.3.1` bundle 可访问，但 jsDelivr `@v0.3.1/app/dist/vn.bundle.js` 返回 404。
- `loader/vn-loader.js` 现在会用 raw GitHub manifest 解析版本后，先探测 jsDelivr tag bundle；如果 tag bundle 不可用，会自动 fallback 到 jsDelivr `@main` 并加 cache bust，避免刚发布标签时测试入口打不开。
- 扩展 `app/tests/gate-contract.test.js`：新增 VM 回归测试，模拟 manifest 返回 `0.3.2`、版本 tag 探测 404，要求 loader 不弹窗并改用 `@main/app/dist/vn.bundle.js`。
- `app/package.json`、`app/src/core/bootstrap.js`、阅读器默认版本、`app/dist/manifest.json` 与 `loader/vn-loader.json` 同步提升到 `v0.3.2`。

### v0.3.1 - 2026-06-13

- 修复 `web` 网页全屏与 `fullscreen` 浏览器全屏模式下打开设置页时设置面板只剩顶部空壳、tabs/body 不显示或落在可视区外的问题。
- `app/src/visual/visual-novel-ui/settings-style.js` 恢复原版 Visual Novel 的 `#vn-unified-settings` viewport 盒模型：使用 `--vn-settings-vleft / --vn-settings-vtop / --vn-settings-vw / --vn-settings-vh` 控制 `left / top / width / height`，并保留原版设置页按钮、tabs 和毛玻璃面板样式。
- `app/src/visual/visual-novel-ui/reader-host.js` 为设置面板补回 `visualViewport.resize / visualViewport.scroll / resize / orientationchange` 监听，关闭设置页时会清理事件和 RAF；Node 模拟环境增加设置页 fallback DOM，用于稳定断言 shell/head/tabs/body。
- 扩展 `app/tests/gate-contract.test.js` 与 `app/tests/simulate.test.js`：新增设置 CSS viewport 变量契约，以及 `web/fullscreen` 打开设置后完整渲染并随 visualViewport 偏移更新的回归测试。
- `app/package.json`、`app/src/core/bootstrap.js`、阅读器源码默认版本与 `loader/vn-loader.js` 默认标签同步提升到 `v0.3.1`；本轮发布需重新生成 `app/dist/manifest.json` 与 `loader/vn-loader.json`。

### v0.3.0 - 2026-06-13

- 重构 `app/src/visual/visual-novel-ui/reader-host.js` 的运行时层，补齐原版 VN 的四模式行为：`pc` 固定 `900x540` 浮窗、`mobile` 固定 `480x680` 浮窗、`web` 模式锁定 `body/html` 滚动并跟随 `visualViewport` 高度、`fullscreen` 模式主动调用浏览器 `requestFullscreen` 并在退出全屏时关闭阅读器。
- 修复正文 fallback：当 `scene.text` 为空字符串时，阅读器现在会继续回退到 `formattedText / visibleText / cleanedRaw`，不再出现只剩黑底和工具栏、正文为空的假死状态。
- 恢复原版可见交互：点击背景层可翻页，隐藏后可再次点击背景层恢复，`Escape / ArrowLeft / ArrowRight / Space / H` 键与原版一致；`#vn-toast` 现在会显示段落边界、楼层切换缺宿主、保存/重绘结果等提示。
- `app/src/visual/visual-novel-ui/original-reader-source.js` 补回 `#vn-send-status` 与 spinner 结构，保持原版工具栏 SVG、选择器和单入口契约；`app/fixtures/visual-novel-ui/original-reader-snapshot.json` 同步扩展契约快照。
- 扩展 `app/tests/unit.test.js`、`app/tests/simulate.test.js`：新增空正文 fallback、`pc/mobile` 浮窗几何、`web` 滚动锁定、`fullscreen` 全屏请求、隐藏恢复和 toast 边界反馈的模拟闸门，确保这轮修复不会再悄悄退化。
- `app/package.json`、`app/src/core/bootstrap.js`、`loader/vn-loader.js` 默认版本已同步提升到 `v0.3.0`；本轮发布后需要重新生成 `app/dist/manifest.json` 与 `loader/vn-loader.json`。

### v0.2.14 - 2026-06-13

- 新增 `app/src/generated-images/reader-image-service.js`、`app/src/generated-images/provider-runtime.js` 与 `app/src/media/message-image-cache.js`，把原版 VN 的楼层图片收集、缓存、外部 provider 重绘轮询和保存下载链路拆成独立运行时模块。
- `app/src/host/tavern-helper-adapter.js` 新增 `listMessages()`、`getAdjacentMessage()`、`jumpToMessage()`、`findRegenerateButton()`，并按原版 VN 语义补齐可读楼层筛选、消息归一化和重绘按钮定位。
- `app/src/api/visual-novel-compat.js` 与 `app/src/core/bootstrap.js` 现已接通 `openViewerFromMessage()` 的 `startAtEnd`/`message` 透传、跨楼层跳转、内置 image provider 注册，以及阅读器级 `collectMessageImages()` / `generateImage()` / `saveImage()`。
- `app/src/visual/visual-novel-ui/reader-host.js` 现已恢复原版 VN 的 `prev-turn` / `next-turn`、图片重绘、图片保存和按图片数量刷新的进度文本；跨楼层返回上一轮时会从末段打开，保持原版阅读节奏。
- `loader/vn-loader.js`、`app/package.json`、`app/dist/manifest.json` 与阅读器源码默认版本同步提升到 `v0.2.14`；`loader/vn-loader.json` 需由 `npm run build:loader` 重新生成并与源码保持完全一致。
- 扩展 `app/tests/simulate.test.js`、`app/tests/gate-contract.test.js`、`app/tests/unit.test.js`，新增跨楼层切换、provider 图片提取、保存返回可下载 URL、外部重绘轮询更新背景等模拟验收闸门。

### v0.2.13 - 2026-06-12

- 修复阅读器控制器与 DOM 挂载参数错位导致的工具栏全失效问题：`settings`、`hide`、`toggle-bar`、`close` 现在会走真实 controller 行为，关闭会同时卸载阅读器和设置面板。
- 魔法棒入口显示名固定为 `Visual Novel`，继续保留原版 `data-vn-magic-entry="1"`、`vn-magic-entry`、`fa-book-open` 单入口契约，并清理旧 `[data-vn-magic-entry]` 残留。
- 阅读器工具栏恢复原版 SVG 图标、`#vn-bar-btns` 收纳区、`#vn-bar-pinned` 常驻区、`toggle-bar` 与 `close` 常驻按钮；默认状态与原版一致为收纳。
- 设置面板基础页的 `bridge.openMode` 四模式切换现在会即时同步 active reader mode；阅读器页补回常驻按钮配置并持久化到 `vn-reader-settings-v9-<mode>`。
- `prev` / `next` 不再是空占位，已能在当前楼层正文段落之间切换并刷新进度；`prev-turn` / `next-turn` 在模拟环境返回明确宿主消息列表需求，不再静默无响应。
- 扩展 `app/tests/simulate.test.js` 与合约测试，覆盖入口名、SVG 图标、默认收纳、设置打开、四模式切换、隐藏、关闭卸载、段落切换和宿主 UI HTML 泄漏防护。
- 本轮仍不修改原版 `projects/Visual Novel 原版备份/**`；上一轮/下一轮跨楼层真实 DOM 图片缓存与真实 provider 重画/保存仍需后续在 host/generated-images 层继续补齐。

### v0.2.12 - 2026-06-12

- 新增 `app/src/scene/message-source.js`，迁移原版 Visual Novel 的 `DEFAULT_SOURCE_FILTER`、`DEFAULT_VIRTUAL_REGEX`、`getVisibleMessageText()`、`cleanNarrativeSource()`、`buildFormattedTextPipeline()` 和强制 fallback 语义，统一正文提取、正文格式化和宿主 HTML 泄漏防护。
- `app/src/api/visual-novel-compat.js` 现在在 `openLatestAvailable()` / `openViewerFromMessage()` 前先构建 VN 正文 payload，再把清洗后的 `textScene` 送入 `refresh()`，避免 reader 继续直接拿宿主原始 HTML 当正文。
- `app/src/host/magic-wand-entry.js` 恢复原版单一入口契约：`vn-magic-entry`、`data-vn-magic-entry="1"`、`fa-book-open`，并在重扫/销毁时主动清理旧 `[data-vn-magic-entry]` 残留；入口显示名保持 `Visual Novel`。
- `app/src/host/tavern-helper-adapter.js` 增加消息筛选和 DOM 可见正文回填，优先打开最近一条可读的非用户消息，并把 `.mes_text` 提取结果作为 `visibleText` 参与 fallback。
- 新增 `app/fixtures/tavern/host-ui-leak-message.json`，扩展 `app/tests/unit.test.js`、`app/tests/simulate.test.js`、`app/tests/gate-contract.test.js`，固定“只有一个魔法棒入口”“图标必须是 `fa-book-open`”“宿主 UI HTML 不得进入 `.vn-text`”的回归闸门。
- runtime、manifest、loader 默认版本同步提升到 `v0.2.12`，本轮已通过 `npm run gate` 和 `npm run build:loader`。

### v0.2.12-plan - 2026-06-12

- 归档 `plan/v0.2.12-原版VN可用性修复施工图.md`，当时目标是恢复原版 `fa-book-open` 魔法棒入口并修复阅读器把酒馆宿主 HTML 当正文显示的问题；入口文案保持 `Visual Novel`。
- 施工图要求迁移原版 `getVisibleMessageText()`、`cleanNarrativeSource()`、`buildFormattedTextPipeline()` 的正文抽取和清洗语义，并补截图同款 host UI HTML 泄漏回归 fixture。
- 本条为已执行归档；对应实现已在同日发布为 `v0.2.12`。

### v0.2.11 - 2026-06-12

- 修复重复启用自动更新脚本时只弹出“已加载”而不注册魔法棒入口的问题：loader 现在检测到新版 VN 已存在时会调用 `ensureMagicWandEntry()` 重扫入口。
- 如果页面残留旧版 `window.VN`、旧 script/link 或旧 `__VN_AUTO_UPDATE_LOADER__`，loader 会清理残留并重新加载当前版本，避免旧实例阻断新入口注册。
- loader 加载 bundle 后会短时重试 `ensureMagicWandEntry()`，对齐原版 Visual Novel 的“菜单重建后继续重扫入口”行为。

### v0.2.10 - 2026-06-12

- 修复 JS-Slash-Runner 导入报错：`loader/vn-loader.json` 恢复为 `button.enabled=false`、`button.buttons=[]`，不再生成缺少 `visible` 字段的按钮项。
- 删除 `启动 VN`、`重扫入口` 两个酒馆助手按钮；正式用户入口只保留酒馆魔法棒菜单里的 `Visual Novel`。
- 更新 loader 合约测试，强制要求自动更新脚本不提供额外按钮入口，防止后续偏离原版 Visual Novel 的入口形态。

### v0.2.9 - 2026-06-12

- 修复自动更新链路的 CDN 缓存风险：loader 默认先读取 `raw.githubusercontent.com/.../main/app/dist/manifest.json` 获取最新版本号，再加载 jsDelivr 的 `@v<version>` 不可变标签资源。
- `loader/vn-loader.js` 的内置兜底版本升为 `v0.2.9`；仍可通过 `window.VN_LOADER_REF` 或 `window.VN_LOADER_CONFIG.ref` 手动指定 `main`、旧标签或测试分支。
- 发布回查新增远程 CDN 内容确认：本轮已确认 `loader/vn-loader.json` 按钮可从 CDN 拉取；发现 `@main/app/dist/manifest.json` 可能返回旧缓存，因此默认链路不再依赖 jsDelivr 的 `@main` dist。

### v0.2.8 - 2026-06-12

- 新增 `app/src/host/magic-wand-entry.js`，启动后自动向酒馆魔法棒菜单 `#extensionsMenu`、`#extensions_menu`、`.extensions_block .list-group` 注入 `Visual Novel` 入口。
- `bootstrapVN()` 现在会自动挂载魔法棒入口，点击入口会调用 `openLatestAvailable()` 打开最新可用楼层阅读器，并在 `destroy()` 时清理菜单项、委托点击和观察器。
- 公开 API 新增 `ensureMagicWandEntry()` 与 `getMagicWandEntryState()`，用于控制台手动重扫入口、诊断入口状态。
- 新增模拟测试覆盖“魔法棒菜单存在 -> VN 注入入口 -> 点击入口 -> 阅读器打开”的最小闭环；本轮仍不执行真实酒馆实机校验。

### v0.2.7 - 2026-06-12

- 将“每轮结束必须上传 GitHub 并发布版本标签”写入 `AGENTS.md`、`docs/AI_WORKFLOW.md`、`docs/RELEASE.md` 与 `docs/PACKAGING_WORKFLOW.md`。
- 固定回退点规则：每轮有文件改动时必须 `git commit`、`git push origin main`、`git tag -a v<当前版本>`、`git push origin v<当前版本>`，并回查远程分支和标签。
- 标签已存在时禁止覆盖，必须提升 patch 版本后重新发布；只有用户明确要求不上传或不打标签时才允许跳过。

### v0.2.6 - 2026-06-12

- 新增 `app/src/visual/visual-novel-ui/*`，把原版 Visual Novel 的阅读器 overlay、统一设置面板、四个 tab、reader mode 图标和 `.vn-*` selector 抽成独立等价层；浏览器环境挂真实 DOM，Node 模拟测试返回 snapshot/controller。
- 更新 `app/src/core/bootstrap.js`、`app/src/api/visual-novel-compat.js` 与 `app/src/storage/legacy-visual-novel.js`，让 `openSettings()` 不再返回 `settings-ui-not-mounted`，并接通 `openLatestAvailable()` / `openViewerFromMessage()` -> 原版阅读器 UI -> `typeAndSend()` 的最小闭环，同时支持旧 `vn_*` 配置读写回写。
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

- 新增 `app/src/storage/legacy-visual-novel.js`，只读读取 `vn_visual_novel_bridge_config`、`vn-reader-settings-v9-*` 和 `vn-display-mode`。
- 新增 `app/src/api/visual-novel-compat.js`，把 `openSettings()`、`getConfig()`、`getUnifiedSettings()`、`openViewerFromMessage()`、`openLatestAvailable()`、`generateImage()` 收敛到 VN 兼容层。
- 更新 `bootstrapVN()` 与 `tavern-helper-adapter`，让 fake host 可按 message id 读取消息，并将旧 bridge 配置并入初始 config。
- 新增 `app/fixtures/visual-novel/*`、`docs/VISUAL_NOVEL_MIGRATION.md` 与 gate 测试，固定第一阶段兼容基线。
- 当前仍不迁移完整阅读器 DOM、不实现真实 provider 请求、不挂载 `window.VisualNovelBridge` 旧全局别名。

### v0.2.1 - 2026-06-12

- 归档 `plan/v0.2.1-酒馆助手脚本发布打包策划书.md`，明确最终按酒馆助手脚本 JSON 形态发布，参考 `_inbox/酒馆助手脚本-玉子手机.json`。
- 新增 `docs/PACKAGING_WORKFLOW.md`，固定原版 Visual Novel 源路径、VN 源码路径、`app/dist` bundle、`loader/vn-loader.json` 和发布前验收命令。
- 更新 README、AGENTS、AI_WORKFLOW、RELEASE 与 loader README，要求后续涉及打包发布时先读发布工作流文档。
- 明确当前仍不默认接回奶龙工具箱 `project.json / latest / tavern helper` 发布壳；发布导入件采用独立 loader JSON。
- 新增 `loader/vn-loader.js` 与 `app/scripts/build-loader.js`，可通过 `npm run build:loader` 生成项目内 `loader/vn-loader.json` 供酒馆导入测试。
- `npm run gate` 新增 loader JSON 反解校验，确保 `loader/vn-loader.json.content` 与 `loader/vn-loader.js` 原文一致。

### v0.2.0 - 2026-06-12

- 接通最小运行闭环：`bootstrapVN()` 负责 host -> scene -> visual -> public API 的基础装配，并挂载 `window.VN` / `window.VisualNovel`。
- 新增 `app/src/index.js`、`core/bootstrap.js`、`api/public-api.js`、`host/tavern-helper-adapter.js`、`scene/text-parser.js`，让 fake TavernHelper 消息可以解析为 scene 并渲染到 layer。
- 新增 shujuku 安全包装、资源缓存、导入分发和样式契约检查的最小实现，覆盖 v0.1.5 验收闸门的 P0 模拟链路。
- 新增 `app/package.json` 和 `app/scripts/*`，提供 `npm run structure/static/test/simulate/perf/build/gate`。
- 新增 `app/fixtures/` 分层样例和 `app/tests/` 原生 Node 测试，覆盖输入发送、场景解析、视觉模式、生图请求构建、导入契约、样式契约、fake shujuku 刷新和资源缓存。
- `npm run gate` 已通过：structure、static、test、simulate、perf、build 全部成功；未执行真实酒馆、真实 provider 或安装版实机校验。
- 新增独立 GitHub 上传流程，仓库目标为 `xiagaogaozi/Visual-Novel`，上传命令写入 `docs/RELEASE.md` 与 `docs/AI_WORKFLOW.md`。

### v0.1.6 - 2026-06-12

- 新增项目级 `AGENTS.md`，移植 NailongHub 的风险级别、执行清单、防结构腐化、技术债记录和交付说明流程。
- 将 NailongHub 的安装版实机验真要求改写为 Visual Novel 的 fixtures 驱动模拟测试策略。
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
- 增加稳定 DOM 槽位、CSS 变量和 `data-vn-*` 设置桥接要求，保证换皮后 `设置 -> 阅读器` 仍能控制关键 UI 配置。

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

- 新建 Visual Novel 架构目录。
- 建立 `app/` 主工程模块契约、fixtures 与测试目录说明。
- 建立 `docs/` 下的 AI 工作流、Mod API、预设格式、能力分组导入、场景规则与 shujuku 表格页说明。
- 建立根目录 `功能总集表.md`，汇总 Visual Novel 既有能力、已确认新增目标与 UI 结构。
- 按用户要求移除奶龙工具箱发布壳，只保留已确认的独立架构。
