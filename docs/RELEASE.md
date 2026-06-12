# 发布草案

本项目后续采用 GitHub 远程 bundle 发布。

## GitHub 仓库

- GitHub 账号：`xiagaogaozi`
- 仓库名：`immersive-galgame-system`
- 仓库地址：`https://github.com/xiagaogaozi/immersive-galgame-system`
- 本地仓库根目录：`D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\沉浸式galgame系统`
- 默认分支：`main`
- 当前可见性：private

本项目是独立 GitHub 仓库，不使用上级 `nailongwang-main` 仓库提交项目内容。上传前必须确认当前目录存在自己的 `.git/`。

## 目标形态

- `app/dist/igs.bundle.js`
- `app/dist/igs.bundle.css`
- `app/dist/manifest.json`
- `loader/igs-loader.json`

## 边界

- 当前不走奶龙工具箱 `project.json / latest / tavern helper` 发布壳。
- loader 只负责加载远程 bundle。
- 主程序逻辑只来自 `app/`。

## 后续建议命令

```text
npm run gate
npm run build
npm run test
npm run simulate
npm run perf
```

这些命令属于 app 自身工程，不属于奶龙工具箱校验流程。

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
cd "D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\沉浸式galgame系统"
npm run gate
git status --short
git add .
git commit -m "<简短更新说明>"
git push origin main
```

如果需要给 SillyTavern loader 直接加载 GitHub raw bundle，先确认没有真实密钥、真实聊天记录、真实 shujuku 数据和本机私有路径，再将仓库改为 public 或建立单独的公开发布仓库。
