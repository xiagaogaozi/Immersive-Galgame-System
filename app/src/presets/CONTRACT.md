# presets 模块契约

## 职责

- 管理可导入、导出、存储、切换的预设。
- 给各能力页提供统一预设列表模型。

## 预设类型

- `theme-preset`
- `css-preset`
- `scene-regex-preset`
- `text-filter-preset`
- `text-format-preset`
- `prompt-preset`
- `image-provider-preset`
- `image-request-builder-preset`
- `workflow-preset`
- `background-rule-preset`
- `choice-parser-preset`
- `visual-mode-preset`

## 禁止

- 不把 Mod 当作 Preset。
- 不把背景/立绘资源包当作 Preset。
- 不提供快捷键预设导入导出。
