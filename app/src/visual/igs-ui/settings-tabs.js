const BASIC_TAB_TEMPLATE = `
<div class="igs-settings-grid">
  {{openModeField}}
  <div class="igs-settings-section">{{settingsToggles}}</div>
</div>
`.trim();

const REGEX_TAB_TEMPLATE = `
<div class="igs-settings-grid">
  <div class="igs-source-filter">
    <div>
      <div class="igs-source-filter-title">标签解析</div>
      <div class="igs-source-filter-note">先筛出 IGS 正文和图片来源；严格解析未命中时阅读器仍会使用兜底文本打开。</div>
    </div>
    <div class="igs-settings-row">{{filterToggles}}</div>
    <div class="igs-settings-row">{{untaggedToggle}}</div>
    <div class="igs-source-filter-grid">
      {{textIncludeField}}
      {{textExcludeField}}
      <div class="igs-settings-full">{{imageIncludeField}}</div>
    </div>
  </div>
  <div class="igs-source-filter igs-body-format">
    <div>
      <div class="igs-source-filter-title">正文格式化</div>
      <div class="igs-source-filter-note">对标签解析后的正文执行正则替换；不修改酒馆楼层原文。</div>
    </div>
    <div class="igs-settings-row">{{regexToggle}}</div>
    <div class="igs-source-filter-grid">
      {{regexPatternField}}
      {{regexFlagsField}}
      <div class="igs-settings-full">{{regexReplacementField}}</div>
    </div>
    <div class="igs-settings-row">
      <button class="igs-settings-action" data-action="reset-virtual-regex" type="button">恢复默认正文替换</button>
      <button class="igs-settings-action" data-action="test-virtual-regex" type="button">测试当前楼层</button>
    </div>
    <div class="igs-settings-preview" data-result="virtual-regex">{{regexPreview}}</div>
  </div>
</div>
`.trim();

const IMAGE_TAB_TEMPLATE = `
<div class="igs-settings-grid">
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
  <div class="igs-settings-full">
    <div class="igs-settings-result" data-result="image-models">{{imageModelsMessage}}</div>
  </div>
  <div class="igs-settings-full">
    <button class="igs-settings-action" data-action="test-image">{{imageTestActionLabel}}</button>
    <div class="igs-settings-result" data-result="image">{{imageTestHelp}}</div>
  </div>
</div>
`.trim();

const READER_TAB_TEMPLATE = `
<div class="igs-settings-grid">
  {{readerModeField}}
  {{fontSizeField}}
  {{dialogWidthField}}
  {{dialogHeightField}}
  {{glassOpacityField}}
  {{imageCountField}}
  {{inputScaleField}}
  {{toolbarScaleField}}
  {{imgModeField}}
  <div class="igs-settings-section">{{readerToggles}}</div>
  <div class="igs-settings-section igs-settings-full">{{pinnedButtonsField}}</div>
</div>
`.trim();

const SCENE_TAB_TEMPLATE = `
<div class="igs-settings-grid">
  <div class="igs-settings-section igs-settings-full">{{sceneToggle}}</div>
  <div class="{{sceneGroupClass}}">
    <div class="igs-source-filter igs-settings-full">
      <div>
        <div class="igs-source-filter-title">格式规则注入</div>
        <div class="igs-source-filter-note">开启后将通过酒馆 API 向 AI 注入以下系统提示，让 AI 输出 [igs-scene:] 等标签。</div>
      </div>
      {{promptRuleField}}
      <div class="igs-settings-row">
        <button class="igs-settings-action" data-action="reset-prompt-rule" type="button">恢复默认提示词</button>
      </div>
    </div>
    <div class="igs-source-filter igs-settings-full">
      <div>
        <div class="igs-source-filter-title">背景场景</div>
        <div class="igs-source-filter-note">场景名 → 背景图 URL。名为「默认」的条目在无匹配时兜底。子层级（时间→天气）优先级依次升高。</div>
        <div class="igs-source-filter-note">提示：使用 [igs-scene:场景|时间|天气] 切换场景，[igs-char:角色|情绪|对白] 标记对白，[igs-thought:角色|情绪|心里话] 标记心理描写。扫描图优先显示。</div>
      </div>
      {{scenesEditor}}
      <div class="igs-settings-row"><button class="igs-settings-action" data-action="scene-add-bg" type="button">+ 添加背景图</button></div>
    </div>
    <div class="igs-source-filter igs-settings-full">
      <div>
        <div class="igs-source-filter-title">角色立绘</div>
        <div class="igs-source-filter-note">角色名 → 情绪 → 立绘 URL。情绪名为「默认」的条目在无匹配时兜底。</div>
      </div>
      {{charactersEditor}}
      <div class="igs-settings-row"><button class="igs-settings-action" data-action="scene-add-char" type="button">+ 添加角色</button></div>
    </div>
    <div class="igs-source-filter igs-settings-full">
      <div>
        <div class="igs-source-filter-title">对话主题</div>
        <div class="igs-source-filter-note">选择预设或切换自定义逐项调整。</div>
      </div>
      {{themePresetField}}
      <div class="{{themeAdvancedClass}}">
        <div class="igs-source-filter">
          <div class="igs-source-filter-title">角色名</div>
          <div class="igs-settings-row">{{nameFontField}}{{nameColorField}}</div>
          {{nameAlignField}}
        </div>
        <div class="igs-source-filter">
          <div class="igs-source-filter-title">台词</div>
          <div class="igs-settings-row">{{textFontField}}{{textColorField}}</div>
        </div>
        <div class="igs-source-filter">
          <div class="igs-source-filter-title">心里话</div>
          <div class="igs-settings-row">{{thoughtFontField}}{{thoughtColorField}}</div>
        </div>
        <div class="igs-source-filter">
          <div class="igs-source-filter-title">分隔线</div>
          <div class="igs-settings-row">{{dividerField}}{{dividerColorField}}</div>
        </div>
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
