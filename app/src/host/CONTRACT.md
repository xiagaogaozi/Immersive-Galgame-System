# host 模块契约

## 职责

- 适配 TavernHelper、SillyTavern DOM 和酒馆魔法棒菜单。
- 统一定位聊天楼层、当前楼层、输入框、发送按钮和消息图片。
- 提供 `typeIntoInputAndSend(text)`，供阅读器输入框和选项浮窗调用。
- `input-channel.js` 是输入框发送的默认骨架入口。
- `magic-wand-entry.js` 是酒馆魔法棒菜单入口的唯一实现，负责向 `#extensionsMenu`、`#extensions_menu`、`.extensions_block .list-group` 注入 `Immersive Galgame System` 菜单项；入口保留原版书本图标和单入口魔法棒契约。
- QR（快速回复）入口：脚本按钮由 loader JSON 的 `button` 字段固定声明，loader content（酒馆助手脚本上下文）用全局 `getButtonEvent`/`eventOn`/`replaceScriptButtons` 绑定点击并按 `localStorage['igs:entry:qr']` 标志显隐；app bundle 仅通过写该标志控制开关，不在主页面上下文直接调脚本按钮 API。
- `extension-panel.js` 在扩展设置面板（`#extensions_settings2` 等锚点）挂 inline-drawer 抽屉，提供启用魔法棒/QR 开关与打开设置/打开阅读器快捷入口。
- 入口启用状态由 `bridge.entry = { magic, qr }` 驱动（默认 magic:true, qr:false）；魔法棒由 bootstrap attach/destroy，QR 由写 `localStorage['igs:entry:qr']` 标志驱动 loader content。
- 隔离宿主 DOM 选择器变化，避免其它模块直接依赖 `#send_textarea`、`#send_but` 等选择器。

## 输入发送契约

- 写入酒馆输入框。
- 触发 `input` / `change` 等必要事件。
- 再点击发送按钮或调用等价宿主行为。
- 不直接创建聊天消息，避免绕过 shujuku 剧情推进。

## 禁止

- 禁止业务模块直接扫全局 DOM 发送消息。
- 禁止绕过 `magic-wand-entry.js` 在其它模块重复注入魔法棒入口。
- 禁止在 host 层修改 shujuku 表格数据。
- 禁止吞掉宿主错误；必须向 `actions` 或 `visual` 返回可展示错误。
