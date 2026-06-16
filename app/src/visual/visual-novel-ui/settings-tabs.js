const BASIC_TAB_TEMPLATE = `
<div class="vn-settings-grid">
  {{openModeField}}
  <div class="vn-settings-section">{{settingsToggles}}</div>
</div>
`.trim();

const REGEX_TAB_TEMPLATE = `
<div class="vn-settings-grid">
  <div class="vn-source-filter">
    <div>
      <div class="vn-source-filter-title">标签解析</div>
      <div class="vn-source-filter-note">先筛出 VN 正文和图片来源；严格解析未命中时阅读器仍会使用兜底文本打开。</div>
    </div>
    <div class="vn-settings-row">{{filterToggles}}</div>
    <div class="vn-settings-row">{{untaggedToggle}}</div>
    <div class="vn-source-filter-grid">
      {{textIncludeField}}
      {{textExcludeField}}
      <div class="vn-settings-full">{{imageIncludeField}}</div>
    </div>
  </div>
  <div class="vn-source-filter vn-body-format">
    <div>
      <div class="vn-source-filter-title">正文格式化</div>
      <div class="vn-source-filter-note">对标签解析后的正文执行正则替换；不修改酒馆楼层原文。</div>
    </div>
    <div class="vn-settings-row">{{regexToggle}}</div>
    <div class="vn-source-filter-grid">
      {{regexPatternField}}
      {{regexFlagsField}}
      <div class="vn-settings-full">{{regexReplacementField}}</div>
    </div>
    <div class="vn-settings-row">
      <button class="vn-settings-action" data-action="reset-virtual-regex" type="button">恢复默认正文替换</button>
      <button class="vn-settings-action" data-action="test-virtual-regex" type="button">测试当前楼层</button>
    </div>
    <div class="vn-settings-preview" data-result="virtual-regex">{{regexPreview}}</div>
  </div>
</div>
`.trim();

const IMAGE_TAB_TEMPLATE = `
<div class="vn-settings-grid">
  {{imageModeField}}
  {{adapterField}}
  <div class="{{apiGroupClass}}">
    {{endpointField}}
    {{apiKeyField}}
    {{modelField}}
    {{sizeField}}
    {{stepsField}}
    {{samplerField}}
    {{timeoutField}}
    {{pollIntervalField}}
    {{pollAttemptsField}}
    {{promptPrefixField}}
  </div>
  <div class="vn-settings-full">
    <div class="vn-settings-result" data-result="image-models">{{imageModelsMessage}}</div>
  </div>
  <div class="vn-settings-full">
    <button class="vn-settings-action" data-action="test-image">{{imageTestActionLabel}}</button>
    <div class="vn-settings-result" data-result="image">{{imageTestHelp}}</div>
  </div>
</div>
`.trim();

const READER_TAB_TEMPLATE = `
<div class="vn-settings-grid">
  {{readerModeField}}
  {{fontSizeField}}
  {{dialogWidthField}}
  {{dialogHeightField}}
  {{glassOpacityField}}
  {{imageCountField}}
  {{inputScaleField}}
  {{toolbarScaleField}}
  {{imgModeField}}
  <div class="vn-settings-section">{{readerToggles}}</div>
  <div class="vn-settings-section vn-settings-full">{{pinnedButtonsField}}</div>
</div>
`.trim();

const SCENE_TAB_TEMPLATE = `
<div class="vn-settings-grid">
  <div class="vn-settings-section vn-settings-full">{{sceneToggle}}</div>
  <div class="{{sceneGroupClass}}">
    <div class="vn-source-filter vn-settings-full">
      <div>
        <div class="vn-source-filter-title">格式规则注入</div>
        <div class="vn-source-filter-note">开启后将通过酒馆 API 向 AI 注入以下系统提示，让 AI 输出 @vn-scene: 标签。</div>
      </div>
      {{promptRuleField}}
      <div class="vn-settings-row">
        <button class="vn-settings-action" data-action="reset-prompt-rule" type="button">恢复默认提示词</button>
      </div>
    </div>
    <div class="vn-source-filter vn-settings-full">
      <div>
        <div class="vn-source-filter-title">背景场景</div>
        <div class="vn-source-filter-note">场景名 → 背景图 URL。名为「默认」的条目在无匹配时兜底。</div>
      </div>
      {{scenesEditor}}
      <div class="vn-settings-row"><button class="vn-settings-action" data-action="scene-add-bg" type="button">+ 添加背景图</button></div>
    </div>
    <div class="vn-source-filter vn-settings-full">
      <div>
        <div class="vn-source-filter-title">角色立绘</div>
        <div class="vn-source-filter-note">角色名 → 情绪 → 立绘 URL。情绪名为「默认」的条目在无匹配时兜底。</div>
      </div>
      {{charactersEditor}}
      <div class="vn-settings-row"><button class="vn-settings-action" data-action="scene-add-char" type="button">+ 添加角色</button></div>
    </div>
    <div class="vn-settings-full"><em class="vn-settings-field">提示：在正文中使用 @vn-scene:场景|角色|情绪 来切换画面。省略的字段继承上一次的值。扫描图优先显示。</em></div>
    <div class="vn-source-filter vn-settings-full">
      <div>
        <div class="vn-source-filter-title">对话主题</div>
        <div class="vn-source-filter-note">影响角色名、分隔线和心声样式。选择预设或自定义各项。</div>
      </div>
      {{themePresetField}}
      {{nameAlignField}}
      <div class="{{themeAdvancedClass}}">
        {{dividerField}}
        {{nameFontField}}
        {{textFontField}}
        {{thoughtFontField}}
        {{nameColorField}}
        {{textColorField}}
        {{thoughtColorField}}
        {{dividerColorField}}
      </div>
    </div>
  </div>
</div>
`.trim();

export const SETTINGS_TAB_DEFS = Object.freeze([
    ['basic', '基础'],
    ['regex', '正文替换'],
    ['image', '图像'],
    ['scene', '场景'],
    ['reader', '阅读器'],
]);

export function getSettingsTabTemplate(tab) {
    switch (tab) {
        case 'basic':
            return BASIC_TAB_TEMPLATE;
        case 'regex':
            return REGEX_TAB_TEMPLATE;
        case 'image':
            return IMAGE_TAB_TEMPLATE;
        case 'scene':
            return SCENE_TAB_TEMPLATE;
        case 'reader':
            return READER_TAB_TEMPLATE;
        default:
            return BASIC_TAB_TEMPLATE;
    }
}
