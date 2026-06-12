# 发布与打包工作流

本项目采用 GitHub 远程 bundle + 酒馆助手脚本 loader JSON 发布。loader 形态参考 `_inbox/酒馆助手脚本-玉子手机.json`。

## GitHub 仓库

- GitHub 账号：`xiagaogaozi`
- 仓库名：`immersive-galgame-system`
- 仓库地址：`https://github.com/xiagaogaozi/immersive-galgame-system`
- 本地仓库根目录：`D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\沉浸式galgame系统`
- 默认分支：`main`
- 当前可见性：public

本项目是独立 GitHub 仓库，不使用上级 `nailongwang-main` 仓库提交项目内容。上传前必须确认当前目录存在自己的 `.git/`。

## 目标形态

- `app/dist/igs.bundle.js`
- `app/dist/igs.bundle.css`
- `app/dist/manifest.json`
- `loader/igs-loader.json`
- `loader/igs-loader.js`

## 边界

- 当前不走奶龙工具箱 `project.json / latest / tavern helper` 发布壳。
- loader 只负责加载远程 bundle。
- 主程序逻辑只来自 `app/`。
- 原版 Visual Novel 只作为迁移来源和兼容参考，路径是 `D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\Visual Novel`。
- 最终给用户导入的是 `loader/igs-loader.json`，不是 `app/dist/igs.bundle.js`。

## loader JSON 格式

`loader/igs-loader.json` 必须是 JS-Slash-Runner 可导入脚本：

```json
{
  "type": "script",
  "enabled": false,
  "name": "沉浸式 Galgame 系统（自动更新）",
  "id": "<固定 UUID>",
  "content": "<loader/igs-loader.js 的原文>",
  "info": "沉浸式 Galgame 系统自动更新 loader。",
  "button": {
    "enabled": false,
    "buttons": []
  },
  "data": {},
  "export_with": {
    "data": true,
    "button": true
  }
}
```

`loader/igs-loader.js` 只做重复加载检查、版本解析、CSS 注入、JS 注入和错误提示，不承载业务 UI。
`loader/igs-loader.json` 不提供额外酒馆助手按钮；正式入口必须由主程序注入酒馆魔法棒菜单。

默认远程加载策略：

```text
GitHub raw main/app/dist/manifest.json -> 读取 version -> jsDelivr @v<version>/app/dist/igs.bundle.*
```

不要默认直接依赖 jsDelivr `@main/app/dist/*`，因为 CDN 可能返回旧 dist。需要临时测试主分支时，可以手动设置 `window.IGS_LOADER_REF = 'main'` 或 `window.IGS_LOADER_CONFIG.ref`。

## 后续建议命令

```text
npm run gate
npm run build:loader
npm run build
npm run test
npm run simulate
npm run perf
```

这些命令属于 app 自身工程，不属于奶龙工具箱校验流程。

生成 loader JSON 后，必须额外验证 JSON 字段和 `content`：

```powershell
node -e "const fs=require('fs'); const js=fs.readFileSync('loader/igs-loader.js','utf8'); const j=JSON.parse(fs.readFileSync('loader/igs-loader.json','utf8')); if(j.type!=='script'||j.content!==js||!j.content.includes('igs.bundle.js')) throw new Error('bad loader json');"
```

## 上传流程

首次上传：

```powershell
cd "D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\沉浸式galgame系统"
git init -b main
git add .
git commit -m "Initialize immersive galgame system"
gh repo create xiagaogaozi/immersive-galgame-system --private --source . --remote origin --push
```

后续更新：

```powershell
cd "D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\沉浸式galgame系统\app"
npm run gate
cd ..
git status --short
git add .
git commit -m "<简短更新说明>"
git push origin main
git tag -a v<当前版本> -m "v<当前版本>: <简短更新说明>"
git push origin v<当前版本>
git ls-remote --heads origin main
git ls-remote --tags origin v<当前版本>
```

## 每轮必须上传与打标签

- 任何实现、修复、文档工作流变更、fixtures/test 变更，只要写入了文件，结束前都必须推送到 `origin/main` 并创建版本标签。
- 标签格式固定为 `vMAJOR.MINOR.PATCH`，必须与 `app/package.json` 中的版本对应。
- 标签已存在时禁止覆盖，提升 patch 版本再发布。
- 文档-only 任务可以跳过 `npm run gate`，但仍需提交、推送和打标签；跳过验证必须在最终回复说明。
- 上传必须在本项目独立仓库根目录执行，先确认 `git rev-parse --show-toplevel` 返回本项目目录。

如果需要给 SillyTavern loader 直接加载 GitHub raw bundle，先确认没有真实密钥、真实聊天记录、真实 shujuku 数据和本机私有路径，再保持仓库 public 或建立单独的公开发布仓库。

private raw 地址不能作为普通用户的最终自动更新源。真正发布前必须选择 public 仓库、公开 release asset 或单独公开发布仓库。

更完整的打包发布规则见 `docs/PACKAGING_WORKFLOW.md`。
