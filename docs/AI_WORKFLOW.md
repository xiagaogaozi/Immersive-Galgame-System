# AI 工作流

本项目主要由 AI 根据用户方向逐步实现，因此必须让每次改动都能被定位、测试和回滚。

## 开工前

1. 读取根目录 `README.md`。
2. 读取根目录 `AGENTS.md`，判定 `R0-R5` 风险级别。
3. 读取 `功能总集表.md`。
4. 按任务找到 `app/src/<模块>/CONTRACT.md`；shujuku 数据层读取 `app/src/data/shujuku/CONTRACT.md`。
5. 涉及跨模块数据结构时读取 `docs/SCHEMA_AND_FIXTURES.md` 与 `app/src/schemas/CONTRACT.md`。
6. 涉及模块流向或归属不清时读取 `docs/ARCHITECTURE.md`。
7. 只修改对应模块，跨模块必须说明原因。
8. 当前项目不使用奶龙工具箱发布壳；不要新增 `project.json`、`latest/`、`tavern helper/` 等发布壳相关目录或清单，除非用户明确要求进入发布实施阶段。
9. 涉及打包、发布、上传、loader、远程 bundle 或酒馆助手脚本 JSON 时，读取 `docs/PACKAGING_WORKFLOW.md` 与 `docs/RELEASE.md`。

## 执行中清单

功能修改、bug 修复、结构调整和发布流程改动按 `AGENTS.md` 的短清单推进。每完成一项就更新状态；不适用项写明原因，不静默跳过。

## 修改中

- 单文件尽量不超过 300 行。
- 新能力优先新增模块，不把逻辑塞进入口。
- 新增可切换配置时进入 `presets`。
- 新增本地/URL/生成图片缓存时进入 `media`。
- 新增背景规则和背景资源业务时进入 `backgrounds`。
- 新增立绘、头像和说话人匹配时进入 `characters`。
- 新增生图 provider、队列和轮询时进入 `generated-images`。
- 新增模型专属请求构建时进入 `generated-images/request-builders`。
- 新增提示词上下文适配时进入 `prompts/adapters`。
- 新增模型提示词/工作流 schema 时进入 `prompts/schemas`。
- 新增跨模块通用 schema 时进入 `schemas`。
- 新增 JS 扩展能力时进入对应能力页和 `mods`。
- 新增 shujuku 数据读写时进入 `data/shujuku`。
- 新增 shujuku 表格交互 UI 时进入 `shujuku-panel`。

## 验收

每次实现代码后至少准备：

```text
npm run gate
npm run test
npm run simulate
npm run build
npm run perf
```

当前本机可执行命令使用 npm。后续安装 pnpm 后，保持以下命令等价：

```text
pnpm gate
pnpm test
pnpm simulate
pnpm build
pnpm perf
```

`gate` 顺序固定为：

```text
structure -> static -> test -> simulate -> perf -> build
```

任何一层失败时先修当前层，不继续用后续错误覆盖根因。

本项目不运行奶龙工具箱 `pack-project`、`verify-project`、`validate`、`check-refs` 作为本项目验收，除非用户明确要求重新接入工具箱流程。

NailongHub 工作流中的安装版实机验真、Computer Use 实机操作和 live AI 校验，在本项目默认替换为 `docs/SCHEMA_AND_FIXTURES.md` 的 `S0-S10` 模拟测试矩阵。真实酒馆、真实 provider 或真实 shujuku 写入只在用户明确要求时加入。

## 酒馆助手脚本打包

最终发布给用户导入的是：

```text
loader/igs-loader.json
```

该文件是 JS-Slash-Runner / 酒馆助手脚本 JSON，结构参考：

```text
D:\下载\酒馆\奶龙王\nailongwang-main\_inbox\酒馆助手脚本-玉子手机.json
```

发布数据流固定为：

```text
app/src/** -> npm run build -> app/dist/igs.bundle.js + app/dist/igs.bundle.css -> loader/igs-loader.js -> loader/igs-loader.json
```

原版 Immersive Galgame System 脚本只作为迁移来源和兼容参考，位置固定为：

```text
<当前项目目录> 原版备份
```

打包发布任务必须遵守：

- 先跑 `npm run gate`，文档-only 任务可 skipped 但必须说明原因。
- `loader/igs-loader.js` 只负责加载远程 bundle，不写业务逻辑。
- `loader/igs-loader.json` 的 `content` 必须等于 `loader/igs-loader.js` 原文。
- 当前仓库是 private 时，不得把 private raw 地址写成最终用户可用发布源。
- 具体字段、校验命令和公开地址限制见 `docs/PACKAGING_WORKFLOW.md`。

## GitHub 上传

本项目拥有独立 GitHub 仓库：

```text
https://github.com/xiagaogaozi/Immersive-Galgame-System
```

上传前必须在项目根目录运行：

```text
npm run gate
git status --short
```

确认通过后，只提交本项目目录内文件。不要从上级 `nailongwang-main` 仓库提交，也不要把真实 API key、真实聊天记录、真实 shujuku 数据、本机私有配置或 `pc-data/` 上传。

## 每轮结束回退点

每一轮只要产生文件改动，结束前必须上传并打标签。默认命令：

```powershell
cd "<当前项目目录>\app"
npm run gate
cd ..
git status --short
git add .
git commit -m "Release v<当前版本>: <简短说明>"
git push origin main
git tag -a v<当前版本> -m "v<当前版本>: <简短说明>"
git push origin v<当前版本>
git status --short --branch
git ls-remote --heads origin main
git ls-remote --tags origin v<当前版本>
```

如果标签已存在，不覆盖、不强推，提升 patch 版本后重新执行。只有用户明确说不要上传或不要打标签时才跳过，并在最终回复说明原因。

详细发布与上传命令见 `docs/RELEASE.md`。
