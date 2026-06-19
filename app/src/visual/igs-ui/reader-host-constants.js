export const DEFAULT_IMAGE_API = Object.freeze({
    mode: 'extension',
    externalAdapter: 'auto',
    endpoint: '',
    apiKey: '',
    model: '',
    size: '832x1216',
    steps: 28,
    sampler: 'k_euler_ancestral',
    requestTimeoutMs: 30000,
    pollIntervalMs: 2000,
    pollAttempts: 60,
    promptPrefix: '',
    availableModels: [],
    modelsFetchedAt: '',
});

export const VN_THEME_PRESETS = Object.freeze({
    genshin: Object.freeze({
        nameAlign: 'center',
        textAlign: 'left',
        narrationAlign: 'left',
        thoughtAlign: 'left',
        dividerSymbol: '───◇───',
        nameFont: 'inherit',
        textFont: 'inherit',
        thoughtFont: 'inherit',
        narrationFont: 'inherit',
        nameColor: '#ffeeb8',
        textColor: '#f4f4f6',
        thoughtColor: '#c8c8dc',
        narrationColor: '#f4f4f6',
        dividerColor: '#ffeeb8',
    }),
    honkai: Object.freeze({
        nameAlign: 'center',
        textAlign: 'left',
        narrationAlign: 'left',
        thoughtAlign: 'left',
        dividerSymbol: '──✦──',
        nameFont: 'inherit',
        textFont: 'inherit',
        thoughtFont: 'inherit',
        narrationFont: 'inherit',
        nameColor: '#c8e0ff',
        textColor: '#e8ecf4',
        thoughtColor: '#a0beff',
        narrationColor: '#e8ecf4',
        dividerColor: '#c8e0ff',
    }),
    minimal: Object.freeze({
        nameAlign: 'left',
        textAlign: 'left',
        narrationAlign: 'left',
        thoughtAlign: 'left',
        dividerSymbol: 'none',
        nameFont: 'inherit',
        textFont: 'inherit',
        thoughtFont: 'inherit',
        narrationFont: 'inherit',
        nameColor: '#b3b3b3',
        textColor: '#f4f4f6',
        thoughtColor: '#808080',
        narrationColor: '#f4f4f6',
        dividerColor: '#404040',
    }),
});

export const READER_REQUIRED_SETTINGS_PATHS = Object.freeze([
    'readerSettings.fontSize',
    'readerSettings.dialogWidth',
    'readerSettings.dialogHeight',
    'readerSettings.glassOpacity',
    'readerSettings.imageCountOverride',
    'readerSettings.inputScale',
    'readerSettings.toolbarScale',
    'readerSettings.imgMode',
    'readerSettings.showStatusLine',
    'readerSettings.pinnedBtns',
    'readerSettings.hiddenBtns',
    'readerSettings.btnOrder',
    'readerSettings.spriteLayouts',
    'readerSettings.vnTheme.preset',
]);

export const SETTINGS_PANEL_REQUIRED_SELECTORS = Object.freeze([
    '#igs-unified-settings',
    '.igs-settings-shell',
    '.igs-settings-head',
    '.igs-settings-tabs',
    '.igs-settings-body',
    '.igs-segmented',
    '.igs-source-filter',
    '.igs-settings-preview',
]);

export const SETTINGS_PANEL_TAB_CONTRACT = Object.freeze({
    basic: Object.freeze({
        label: '基础',
        requiredPaths: Object.freeze([
            'bridge.openMode',
            'bridge.showToasts',
        ]),
    }),
    regex: Object.freeze({
        label: '正文替换',
        requiredPaths: Object.freeze([
            'bridge.sourceFilter.enabled',
            'bridge.sourceFilter.textIncludeTags',
            'bridge.sourceFilter.textExcludeTags',
            'bridge.sourceFilter.imageIncludeTags',
            'bridge.virtualRegex.enabled',
            'bridge.virtualRegex.pattern',
            'bridge.virtualRegex.flags',
            'bridge.virtualRegex.replacement',
        ]),
        requiredActions: Object.freeze([
            'reset-virtual-regex',
            'test-virtual-regex',
        ]),
    }),
    image: Object.freeze({
        label: '图像',
        requiredPaths: Object.freeze([
            'bridge.imageApi.mode',
            'bridge.imageApi.externalAdapter',
            'bridge.imageApi.endpoint',
            'bridge.imageApi.apiKey',
            'bridge.imageApi.model',
            'bridge.imageApi.size',
            'bridge.imageApi.steps',
            'bridge.imageApi.sampler',
            'bridge.imageApi.requestTimeoutMs',
            'bridge.imageApi.pollIntervalMs',
            'bridge.imageApi.pollAttempts',
            'bridge.imageApi.promptPrefix',
        ]),
        requiredActions: Object.freeze([
            'fetch-image-models',
            'test-image',
        ]),
    }),
    scene: Object.freeze({
        label: '场景',
        requiredPaths: Object.freeze([
            'bridge.sceneAssets.enabled',
            'bridge.sceneAssets.promptRule',
        ]),
        requiredActions: Object.freeze([
            'reset-prompt-rule',
        ]),
    }),
    reader: Object.freeze({
        label: '阅读器',
        requiredPaths: READER_REQUIRED_SETTINGS_PATHS,
    }),
});

export const TOOLBAR_ACTIONS = Object.freeze([
    ['db-panel', '数据库'],
    ['prev-turn', '上一轮'],
    ['first-page', '第一页'],
    ['prev', '上一页'],
    ['next', '下一页'],
    ['last-page', '最后一页'],
    ['next-turn', '下一轮'],
    ['regen', '重新生图'],
    ['save', '保存图片'],
    ['hide', '隐藏对话框'],
    ['sprite-edit', '调整立绘'],
    ['rescan', '刷新'],
    ['settings', '设置'],
]);

export const DEFAULT_PINNED_TOOLBAR_BUTTONS = Object.freeze([]);
export const READER_SETTINGS_SCHEMA_VERSION = '0.5.2';
export const INITIAL_IMAGE_POLL_ATTEMPTS = 8;
export const INITIAL_IMAGE_POLL_INTERVAL_MS = 250;

export const DEFAULT_SCENE_PROMPT_RULE = `[对话与场景渲染格式规范]
使用以下三种标签控制场景与角色，每条标签单独一行，方括号为固定边界：

[igs-scene:场景名|时间|天气]
[igs-char:角色名|情绪|对白]
[igs-thought:角色名|情绪|心里话]

格式规则：
1. 三种标签均为单行，方括号是固定边界，不可拆行
2. 字段之间用 | 分隔，字段内不得含 | 或 ]
3. [igs-scene] 在消息开头出现一次，换场景时再出现一次，其余省略
4. [igs-char] 每次角色开口时使用，角色名必须输出完整全名（如"城崎诺亚"不能只写"诺亚"）
5. [igs-thought] 用于心理描写，可与 [igs-char] 独立出现
6. 情绪字段不得省略，必须填写
7. 旁白和叙述文字正常书写，不加任何标记
8. 场景名是背景图关联的唯一标识，同一地点每次输出必须完全一致
9. 角色名是立绘关联的唯一标识，每次输出必须完全一致
10. 不知道名字的角色使用「？？？」；路人/NPC 使用「男路人A」「女同学B」等

[情绪词约束]
情绪字段必须从以下固定池中选取（2-3 字词），禁止自造新词：
{{mood_groups}}

[场景字段约束]
场景字段只能定位到空间概念（如卧室、客厅、走廊、花园），禁止定位到家具或摆设（如床铺、梳妆台、窗台）。
（可选）下方 {{scene_groups}} 占位符会替换为已配置的场景名词库，删除此行即不注入：
{{scene_groups}}

[时间字段约束]
时间字段只能使用笼统时间段（早晨 / 上午 / 中午 / 下午 / 傍晚 / 晚上 / 深夜），禁止出现具体时分秒。
（可选）下方 {{time_groups}} 占位符会替换为已配置的时间词库，删除此行即不注入：
{{time_groups}}

[天气字段约束]
天气字段只能使用天气类型词（如晴天、多云、小雨、大雨、雷雨、小雪、大雪），禁止使用温度或体感词（如微寒、凉爽、炎热）。
（可选）下方 {{weather_groups}} 占位符会替换为已配置的天气词库，删除此行即不注入：
{{weather_groups}}

[正文标签规则]
<content> 标签外面必须包一层 <now_plot> 标签。

输出结构：
<now_plot>
<content>
（正文内容）
</content>
</now_plot>

示例：
<now_plot>
<content>
诺亚傻站着愣了半秒，忽闪着大眼睛直勾勾盯着我。

[igs-scene:教室|下午|晴天]
[igs-char:城崎诺亚|欣喜|咦？真的吗？]

[igs-thought:城崎诺亚|紧张|我真的能做好吗？]

她似乎在脑海里搜索着相关的经验，过了一会儿，她居然真的点了点头。

[igs-char:城崎诺亚|开心|听起来好像挺简单的。那诺亚试试看好了！]

樱在旁边叹了口气，看起来并不想掺和这件事。

[igs-char:樱|无奈|别把我拉进去啊。]

[igs-char:？？？|兴奋|喂！你们！]

[igs-char:男同学A|慌张|是……是清野同学，我们该撤了]

那两个同学飞快的跑了，几人看到清野飞快的跑了过来

[igs-scene:走廊|下午|晴天]
[igs-char:清野|兴奋|刚刚你们在这边干什么呢！]

</content>
</now_plot>`.trim();
