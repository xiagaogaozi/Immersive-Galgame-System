# loader

后续发布到酒馆时，这里放小型自动更新 loader。

## 边界

- loader 只负责加载 GitHub 远程 bundle。
- loader 不属于奶龙工具箱 `tavern helper/` 发布壳。
- loader 不负责业务逻辑、Mod 管理、shujuku 表格或 UI 渲染。
- loader 的发布形态参考 `D:\下载\酒馆\奶龙王\nailongwang-main\_inbox\酒馆助手脚本-玉子手机.json`。
- loader JSON 的 `content` 必须来自 `igs-loader.js` 原文。

## 预计产物

- `igs-loader.js`
- `igs-loader.json`

生成命令：

```powershell
cd "D:\下载\酒馆\奶龙王\nailongwang-main\奶龙工具箱\projects\沉浸式galgame系统\app"
npm run build:loader
```

## 固定职责

`igs-loader.js` 只允许：

- 阻止重复加载。
- 选择远程版本或读取远程 manifest。
- 注入 `igs.bundle.css`。
- 注入 `igs.bundle.js`。
- 输出加载状态和失败原因。

主程序业务逻辑必须放在 `../app/src/`，构建后进入 `../app/dist/`。

详细打包发布流程见 `../docs/PACKAGING_WORKFLOW.md`。
