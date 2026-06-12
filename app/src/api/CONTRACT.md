# api 模块契约

## 职责

- 提供给二创作者的公开 API。
- API 按能力分组，不提供泛用的 `registerAnything`。

## 命名

- `window.IGS`
- `window.ImmersiveGalgameSystem`

## 分组示例

```js
IGS.api.imageProviders.register(provider);
IGS.api.imageProviders.unregister(id);
IGS.api.imageRequestBuilders.register(builder);
IGS.api.actions.register(action);
IGS.api.components.register(component);
IGS.api.choiceComponents.register(component);
IGS.api.themePresets.register(preset);
IGS.api.uiSkins.register(preset);
IGS.api.sceneRegexPresets.register(preset);
IGS.api.backgroundPacks.register(pack);
IGS.api.characterPacks.register(pack);
IGS.api.promptPresets.register(preset);
```

## 稳定性要求

公开 API 只增不破；破坏性变更必须进入主版本升级。

## 兼容要求

- 迁移期保留 Visual Novel 既有公开能力的兼容入口：`openSettings()`、`getConfig()`、`getUnifiedSettings()`、`generateImage()`、`destroy()`。
- 新二创能力优先挂在 `IGS.api.*` 下，不继续扩散旧 `VisualNovelBridge` 调试入口。
