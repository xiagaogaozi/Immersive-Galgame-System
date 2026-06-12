const BASIC_TAB_TEMPLATE = `
<div class="vnm-settings-grid">
  {{openModeField}}
  <div class="vnm-settings-section">{{settingsToggles}}</div>
</div>
`.trim();

const REGEX_TAB_TEMPLATE = `
<div class="vnm-settings-grid">
  <div class="vnm-source-filter">
    <div>
      <div class="vnm-source-filter-title">标签解析</div>
      <div class="vnm-source-filter-note">先筛出 VN 正文和图片来源；严格解析未命中时阅读器仍会使用兜底文本打开。</div>
    </div>
    <div class="vnm-settings-row">{{filterToggles}}</div>
    <div class="vnm-settings-row">{{untaggedToggle}}</div>
    <div class="vnm-source-filter-grid">
      {{textIncludeField}}
      {{textExcludeField}}
      <div class="vnm-settings-full">{{imageIncludeField}}</div>
    </div>
  </div>
  <div class="vnm-source-filter vnm-body-format">
    <div>
      <div class="vnm-source-filter-title">正文格式化</div>
      <div class="vnm-source-filter-note">对标签解析后的正文执行正则替换；不修改酒馆楼层原文。</div>
    </div>
    <div class="vnm-settings-row">{{regexToggle}}</div>
    <div class="vnm-source-filter-grid">
      {{regexPatternField}}
      {{regexFlagsField}}
      <div class="vnm-settings-full">{{regexReplacementField}}</div>
    </div>
    <div class="vnm-settings-row">
      <button class="vnm-settings-action" data-action="reset-virtual-regex" type="button">恢复默认正文替换</button>
      <button class="vnm-settings-action" data-action="test-virtual-regex" type="button">测试当前楼层</button>
    </div>
    <div class="vnm-settings-preview" data-result="virtual-regex">{{regexPreview}}</div>
  </div>
</div>
`.trim();

const IMAGE_TAB_TEMPLATE = `
<div class="vnm-settings-grid">
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
  <div class="vnm-settings-full">
    <div class="vnm-settings-result" data-result="image-models">{{imageModelsMessage}}</div>
  </div>
  <div class="vnm-settings-full">
    <button class="vnm-settings-action" data-action="test-image">{{imageTestActionLabel}}</button>
    <div class="vnm-settings-result" data-result="image">{{imageTestHelp}}</div>
  </div>
</div>
`.trim();

const READER_TAB_TEMPLATE = `
<div class="vnm-settings-grid">
  {{readerModeField}}
  {{fontSizeField}}
  {{dialogWidthField}}
  {{dialogHeightField}}
  {{glassOpacityField}}
  {{imageCountField}}
  {{inputScaleField}}
  {{toolbarScaleField}}
  {{imgModeField}}
  <div class="vnm-settings-section">{{readerToggles}}</div>
</div>
`.trim();

export const SETTINGS_TAB_DEFS = Object.freeze([
    ['basic', '基础'],
    ['regex', '正文替换'],
    ['image', '图像'],
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
        case 'reader':
            return READER_TAB_TEMPLATE;
        default:
            return BASIC_TAB_TEMPLATE;
    }
}
