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
- 当前不保留奶龙工具箱发布壳，不走奶龙工具箱流程校验。
- 保留独立 `loader/` 目录，用于后续 GitHub 远程 bundle 自动更新入口。
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

## 更新日志

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
