import { LEGACY_READER_MODES, resolveLegacyReaderMode } from '../../storage/legacy-visual-novel.js';
import {
    buildVisualNovelTextPayload,
    DEFAULT_VIRTUAL_REGEX,
    getMessagePrimaryText,
    looksLikeHostUiHtml,
    normalizeSourceFilter,
    normalizeVirtualRegex,
} from '../../scene/message-source.js';
import { buildNarrativeSegments } from '../../scene/image-slots.js';
import { resolveSceneStateAtIndex, lookupSceneAssetUrls } from '../../scene/scene-directives.js';
import {
    getOriginalReaderHtml,
    ORIGINAL_READER_ICONS,
    getOriginalReaderSource,
    getOriginalReaderStyleText,
    ORIGINAL_READER_REQUIRED_SELECTORS,
    ORIGINAL_READER_STYLE_CONTRACT,
    ORIGINAL_READER_TOOLBAR_BUTTONS,
} from './original-reader-source.js';
import { getSettingsShellTemplate } from './settings-shell.js';
import { getSettingsStyleText } from './settings-style.js';
import { getSettingsTabTemplate, SETTINGS_TAB_DEFS } from './settings-tabs.js';
import { getReaderModeIcon } from './icons.js';

const DEFAULT_IMAGE_API = Object.freeze({
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

const READER_REQUIRED_SETTINGS_PATHS = Object.freeze([
    'readerMode',
    'readerSettings.fontSize',
    'readerSettings.dialogWidth',
    'readerSettings.dialogHeight',
    'readerSettings.glassOpacity',
    'readerSettings.imageCountOverride',
    'readerSettings.inputScale',
    'readerSettings.toolbarScale',
    'readerSettings.imgMode',
    'readerSettings.stayMode',
    'readerSettings.pinnedBtns',
    'readerSettings.hiddenBtns',
    'readerSettings.btnOrder',
    'readerSettings.spriteLayouts',
]);

const SETTINGS_PANEL_REQUIRED_SELECTORS = Object.freeze([
    '#vn-unified-settings',
    '.vn-settings-shell',
    '.vn-settings-head',
    '.vn-settings-tabs',
    '.vn-settings-body',
    '.vn-segmented',
    '.vn-source-filter',
    '.vn-settings-preview',
]);

const SETTINGS_PANEL_TAB_CONTRACT = Object.freeze({
    basic: Object.freeze({
        label: '基础',
        requiredPaths: Object.freeze([
            'bridge.openMode',
            'bridge.showToasts',
            'bridge.debug',
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

const TOOLBAR_ACTIONS = Object.freeze([
    ['prev', '上一段'],
    ['next', '下一段'],
    ['regen', '重新生成背景图'],
    ['rescan', '刷新图位'],
    ['save', '保存背景图'],
    ['settings', '设置'],
    ['hide', '隐藏'],
    ['prev-turn', '上一轮'],
    ['next-turn', '下一轮'],
    ['sprite-edit', '调整立绘'],
]);
const DEFAULT_PINNED_TOOLBAR_BUTTONS = Object.freeze([]);
const READER_SETTINGS_SCHEMA_VERSION = '0.5.1';
const INITIAL_IMAGE_POLL_ATTEMPTS = 8;
const INITIAL_IMAGE_POLL_INTERVAL_MS = 250;

const DEFAULT_SCENE_PROMPT_RULE = `[对话与场景渲染格式规范]
当角色产生想法、进行对白、突然的反应或者有莫名的声音、奇怪的低语出现时必须严格使用以下格式（全部在同一行内）：

@vn-scene:角色名|情绪|场景名|[对白]

格式规则：
1. @vn-scene: 是固定前缀，不可更改
2. 角色名、情绪、场景名、台词之间用 | 分隔，全部在一行内
3. 角色名必须输出完整全名，不允许省略（如"城崎诺亚"不能只写"诺亚"）
4. 角色名是立绘关联的唯一标识，每次输出必须完全一致
5. 只有名没有姓的角色直接写名字（如"云儿"）
6. 台词必须用 [ ] 方括号包裹
7. 旁白和叙述文字正常书写，不加任何标记
8. 每次角色说话都必须带上 @vn-scene 标记，不可省略
9. 多个角色说话时，每个角色分别使用自己的角色名，包括系统声音
10. 角色内心活动或心理描写也要使用此格式，写法为 @vn-scene:角色名|情绪|场景名|[*内心活动*]
11. 心里话只按 *...* 外层结构识别
12. 台词中不能包含 | 符号和 [ ] 符号
13. 情绪字段不能省略，必须填写
14. 场景名表示当前所处地点/环境（如"教室"、"走廊"、"夜晚街道"），场景未变时可留空（保留分隔符），如 @vn-scene:角色名|情绪||[台词]
15. 场景名是背景图关联的唯一标识，同一地点每次输出必须完全一致
16. 开头第一句对话前必须写完整的场景名，不可省略
17. 如果场景内出现路人/同学/同事这类不重要的NPC，则使用 @vn-scene:男/女路人X|情绪|场景名|[对白]
18. 如果是不知道名字的角色，使用 @vn-scene:？？？|情绪|场景名|[对白]

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

@vn-scene:城崎诺亚|欣喜|教室|[咦？真的吗？]

@vn-scene:城崎诺亚|紧张||[*（我真的能做好吗？）*]

她似乎在脑海里搜索着相关的经验，过了一会儿，她居然真的点了点头。

@vn-scene:城崎诺亚|开心||[听起来好像挺简单的。那诺亚试试看好了！]

樱在旁边叹了口气，看起来并不想掺和这件事。

@vn-scene:樱|无奈||[别把我拉进去啊。]

@vn-scene:？？？|兴奋||[喂！你们！]

@vn-scene:男同学A|慌张||[是……是清野同学，我们该撤了]

那两个同学飞快的跑了，几人看到清野飞快的跑了过来

@vn-scene:清野|兴奋|走廊|[刚刚你们在这边干什么呢！]

</content>
</now_plot>`.trim();

export function createVisualNovelReaderHost(options = {}) {
    const state = {
        activeReader: null,
        activeSettings: null,
    };

    const host = {
        openReader,
        openSettings,
        closeReader,
        closeSettings,
        getState,
        destroy,
        getReaderSnapshotContract() {
            return {
                selectors: Array.from(ORIGINAL_READER_REQUIRED_SELECTORS),
                styleContract: { ...ORIGINAL_READER_STYLE_CONTRACT },
            };
        },
        getSettingsSnapshotContract() {
            return {
                selectors: Array.from(SETTINGS_PANEL_REQUIRED_SELECTORS),
                tabs: SETTINGS_TAB_DEFS.map(([id, label]) => ({
                    id,
                    label,
                    requiredPaths: Array.from((SETTINGS_PANEL_TAB_CONTRACT[id] || {}).requiredPaths || []),
                    requiredActions: Array.from((SETTINGS_PANEL_TAB_CONTRACT[id] || {}).requiredActions || []),
                })),
            };
        },
    };

    return host;

    function openReader(payload = {}, openOptions = {}) {
        closeReader();
        const nextMode = normalizeReaderMode(
            firstDefined(
                openOptions.mode,
                payload.mode,
                payload.viewerMode,
                payload.readerMode,
            ),
            resolveBridgeConfigSnapshot({ mode: openOptions.mode }).bridge,
        );
        const unified = resolveBridgeConfigSnapshot({ mode: nextMode });
        const readerSettings = normalizeReaderSettings(nextMode, unified.readerSettings);
        readerSettings._sceneAssets = unified.bridge.sceneAssets || null;
        const snapshot = buildReaderSnapshot(
            payload,
            nextMode,
            readerSettings,
            payload.startAtEnd === true ? Number.MAX_SAFE_INTEGER : 0,
        );
        const controller = createReaderController();
        const domState = mountReaderDom(snapshot, controller);

        state.activeReader = {
            payload: cloneReaderPayload(payload),
            mode: nextMode,
            index: snapshot.content.currentIndex,
            inputValue: '',
            hidden: false,
            dragSuppressClick: false,
            toolbarCollapsed: true,
            lastAction: '',
            toastMessage: '',
            snapshot,
            controller,
            dom: domState,
            floatingState: {
                dragged: false,
                left: null,
                top: null,
            },
            runtime: null,
            toastTimer: null,
            imagePollToken: 0,
        };
        updateMountedReader(snapshot);
        startReaderImagePolling(state.activeReader);

        return {
            ok: true,
            mode: nextMode,
            readerMode: nextMode,
            snapshot: cloneData(snapshot),
            domMounted: Boolean(domState),
            controller,
        };
    }

    function openSettings(openOptions = {}) {
        const normalizedTab = normalizeSettingsTab(openOptions.tab);
        const fallbackMode = state.activeReader ? state.activeReader.mode : undefined;
        const readerMode = normalizeReaderMode(
            firstDefined(openOptions.mode, fallbackMode),
            resolveBridgeConfigSnapshot({ mode: openOptions.mode }).bridge,
        );

        if (state.activeSettings) {
            state.activeSettings.tab = normalizedTab;
            if (readerMode !== state.activeSettings.readerMode) {
                const snapshot = resolveBridgeConfigSnapshot({ mode: readerMode });
                state.activeSettings.readerMode = readerMode;
                state.activeSettings.draft = cloneData(snapshot);
            }
            return rerenderSettings();
        }

        const initialSnapshot = resolveBridgeConfigSnapshot({ mode: readerMode });
        const controller = createSettingsController();
        const settingsState = {
            tab: normalizedTab,
            readerMode,
            draft: cloneData(initialSnapshot),
            asyncState: {},
            controller,
            dom: null,
        };
        state.activeSettings = settingsState;
        settingsState.dom = mountSettingsDom(controller);
        return rerenderSettings();
    }

    function rerenderSettings() {
        if (!state.activeSettings) {
            return { ok: false, reason: 'settings-not-open' };
        }
        const snapshot = buildSettingsSnapshot(state.activeSettings);
        state.activeSettings.snapshot = snapshot;
        updateMountedSettings(snapshot);
        return {
            ok: true,
            tab: state.activeSettings.tab,
            readerMode: state.activeSettings.readerMode,
            snapshot: cloneData(snapshot),
            domMounted: Boolean(state.activeSettings.dom),
            controller: state.activeSettings.controller,
        };
    }

    function closeReader() {
        const current = state.activeReader;
        if (!current) return { ok: true, reason: 'reader-not-open' };
        closeSettings();
        clearReaderToast(current);
        clearReaderModeRuntime(current);
        current.imagePollToken += 1;
        if (current.dom && typeof current.dom.dispose === 'function') {
            current.dom.dispose();
        }
        unmountNode(current.dom && current.dom.root);
        state.activeReader = null;
        return { ok: true };
    }

    function closeSettings() {
        const current = state.activeSettings;
        if (!current) return { ok: true, reason: 'settings-not-open' };
        if (current.dom && typeof current.dom.dispose === 'function') {
            current.dom.dispose();
        }
        unmountNode(current.dom && current.dom.root);
        state.activeSettings = null;
        return { ok: true };
    }

    function getState() {
        return {
            activeReader: state.activeReader ? {
                mode: state.activeReader.mode,
                index: state.activeReader.index,
                hidden: state.activeReader.hidden,
                dragSuppressClick: state.activeReader.dragSuppressClick,
                toolbarCollapsed: state.activeReader.toolbarCollapsed,
                lastAction: state.activeReader.lastAction,
                inputValue: state.activeReader.inputValue,
                toastMessage: state.activeReader.toastMessage,
                floatingState: cloneData(state.activeReader.floatingState),
                snapshot: cloneData(state.activeReader.snapshot),
            } : null,
            activeSettings: state.activeSettings ? {
                tab: state.activeSettings.tab,
                readerMode: state.activeSettings.readerMode,
                snapshot: cloneData(state.activeSettings.snapshot),
            } : null,
        };
    }

    function destroy() {
        closeSettings();
        closeReader();
        return { ok: true };
    }

    function createReaderController() {
        return {
            getSnapshot() {
                return state.activeReader ? cloneData(state.activeReader.snapshot) : null;
            },
            setInputValue(value) {
                if (!state.activeReader) return { ok: false, reason: 'reader-not-open' };
                state.activeReader.inputValue = String(value || '');
                if (state.activeReader.dom && state.activeReader.dom.input) {
                    state.activeReader.dom.input.value = state.activeReader.inputValue;
                }
                return { ok: true, value: state.activeReader.inputValue };
            },
            async submit(text) {
                return submitReaderInput(text);
            },
            async keydown(event = {}) {
                if (event.key !== 'Enter') {
                    return { ok: true, sent: false, reason: 'ignored-key' };
                }
                if (event.shiftKey) {
                    return { ok: true, sent: false, reason: 'shift-enter-kept' };
                }
                return submitReaderInput(firstDefined(event.value, state.activeReader && state.activeReader.inputValue, ''));
            },
            toggleHidden() {
                if (!state.activeReader) return { ok: false, reason: 'reader-not-open' };
                state.activeReader.hidden = !state.activeReader.hidden;
                rerenderActiveReader();
                return { ok: true, hidden: state.activeReader.hidden };
            },
            toggleToolbar() {
                if (!state.activeReader) return { ok: false, reason: 'reader-not-open' };
                state.activeReader.toolbarCollapsed = !state.activeReader.toolbarCollapsed;
                applyToolbarState(state.activeReader.dom && state.activeReader.dom.overlay, state.activeReader);
                return { ok: true, collapsed: state.activeReader.toolbarCollapsed };
            },
            invokeAction(action) {
                return handleReaderAction(action);
            },
            openSettings(tab = 'basic') {
                return openSettings({ tab, mode: state.activeReader ? state.activeReader.mode : 'pc' });
            },
            close() {
                return closeReader();
            },
        };
    }

    function createSettingsController() {
        return {
            getSnapshot() {
                return state.activeSettings ? cloneData(state.activeSettings.snapshot) : null;
            },
            switchTab(tab) {
                if (!state.activeSettings) return { ok: false, reason: 'settings-not-open' };
                state.activeSettings.tab = normalizeSettingsTab(tab);
                return rerenderSettings();
            },
            setValue(path, value) {
                return updateSettingsValue(path, value);
            },
            toggle(path) {
                const current = getPath(state.activeSettings && state.activeSettings.draft, path);
                return updateSettingsValue(path, !current);
            },
            async invoke(action) {
                return handleSettingsAction(action);
            },
            close() {
                return closeSettings();
            },
        };
    }

    async function submitReaderInput(text) {
        if (!state.activeReader) return { ok: false, reason: 'reader-not-open' };
        const nextText = String(firstDefined(text, state.activeReader.inputValue, '') || '');
        const send = typeof options.typeAndSend === 'function'
            ? options.typeAndSend
            : async () => ({ ok: false, reason: 'missing-send-handler' });
        const result = await send(nextText);
        state.activeReader.inputValue = '';
        if (state.activeReader.dom && state.activeReader.dom.input) {
            state.activeReader.dom.input.value = '';
        }
        writeToast(result.ok === false ? (result.reason || '发送失败') : '已发送');
        return {
            ok: result.ok !== false,
            sent: result.ok !== false,
            text: nextText,
            result,
        };
    }

    function updateSettingsValue(path, value) {
        if (!state.activeSettings) return { ok: false, reason: 'settings-not-open' };
        const draft = state.activeSettings.draft;

        if (path === 'readerMode') {
            const nextMode = normalizeReaderMode(value, draft.bridge);
            const snapshot = resolveBridgeConfigSnapshot({ mode: nextMode });
            state.activeSettings.readerMode = nextMode;
            draft.readerMode = nextMode;
            draft.readerSettings = cloneData(snapshot.readerSettings);
            return rerenderSettings();
        }

        if (path === 'bridge.openMode') {
            const nextMode = normalizeReaderMode(value, draft.bridge);
            setPath(draft, path, nextMode);
            const snapshot = resolveBridgeConfigSnapshot({ mode: nextMode });
            state.activeSettings.readerMode = nextMode;
            draft.readerMode = nextMode;
            draft.readerSettings = cloneData(snapshot.readerSettings);
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        setPath(draft, path, normalizeSettingsValue(path, value));
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    function persistSettingsDraft() {
        if (!state.activeSettings) return { ok: false, reason: 'settings-not-open' };
        const draft = state.activeSettings.draft;
        const save = typeof options.saveUnifiedSettings === 'function'
            ? options.saveUnifiedSettings
            : null;
        if (!save) return { ok: false, reason: 'missing-save-handler' };

        const result = save({
            bridge: draft.bridge,
            readerMode: state.activeSettings.readerMode,
            readerSettings: draft.readerSettings,
        });

        if (!result || result.ok === false) {
            return result || { ok: false, reason: 'save-failed' };
        }

        const snapshot = resolveBridgeConfigSnapshot({ mode: state.activeSettings.readerMode });
        state.activeSettings.draft = cloneData(snapshot);
        state.activeSettings.readerMode = snapshot.readerMode;
        rerenderActiveReader();
        return result;
    }

    async function handleSettingsAction(action) {
        if (!state.activeSettings) return { ok: false, reason: 'settings-not-open' };
        const normalizedAction = String(action || '').trim();
        const settingsState = state.activeSettings;

        if (normalizedAction === 'close') {
            return closeSettings();
        }

        if (normalizedAction === 'reset-virtual-regex') {
            settingsState.draft.bridge.virtualRegex = cloneData(DEFAULT_VIRTUAL_REGEX);
            settingsState.asyncState.virtualRegexPreview = '已恢复默认正文替换，已自动保存。';
            persistSettingsDraft();
            return rerenderSettings();
        }

        if (normalizedAction === 'test-virtual-regex') {
            settingsState.asyncState.virtualRegexPreview = buildRegexPreview(settingsState.draft.bridge);
            return rerenderSettings();
        }

        if (normalizedAction === 'fetch-image-models') {
            if (typeof options.fetchImageModels !== 'function') {
                settingsState.asyncState.imageModelsMessage = '当前未接入内置图像模型拉取能力。';
                return rerenderSettings();
            }
            const result = await options.fetchImageModels({
                settings: cloneData(settingsState.draft),
                message: state.activeReader && state.activeReader.payload && state.activeReader.payload.message || null,
                mode: settingsState.readerMode,
            });
            if (!result || result.ok === false) {
                settingsState.asyncState.imageModelsMessage = String(result && result.reason || '图像模型拉取失败');
                return rerenderSettings();
            }
            settingsState.draft.bridge.imageApi.availableModels = Array.isArray(result.models)
                ? result.models.filter(Boolean)
                : [];
            settingsState.draft.bridge.imageApi.modelsFetchedAt = String(result.modelsFetchedAt || new Date().toISOString());
            settingsState.asyncState.imageModelsMessage = String(result.message || `已拉取 ${settingsState.draft.bridge.imageApi.availableModels.length} 个模型。`);
            persistSettingsDraft();
            return rerenderSettings();
        }

        if (normalizedAction === 'test-image') {
            if (typeof options.testImageApi !== 'function') {
                settingsState.asyncState.imageResult = '当前未接入图像测试能力。';
                return rerenderSettings();
            }
            const result = await options.testImageApi({
                settings: cloneData(settingsState.draft),
                message: state.activeReader && state.activeReader.payload && state.activeReader.payload.message || null,
                mode: settingsState.readerMode,
            });
            settingsState.asyncState.imageResult = String(
                result && (result.message || result.reason)
                || (settingsState.draft.bridge.imageApi.mode === 'nai'
                    ? '图像 API 生成测试失败。'
                    : '插图扩展检测失败。'),
            );
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('toggle-toolbar-pin:')) {
            const id = normalizedAction.slice('toggle-toolbar-pin:'.length);
            const allowed = TOOLBAR_ACTIONS.some(([actionId]) => actionId === id);
            if (!allowed) return { ok: false, reason: 'unknown-toolbar-pin', id };
            const currentPins = Array.isArray(settingsState.draft.readerSettings.pinnedBtns)
                ? settingsState.draft.readerSettings.pinnedBtns.slice()
                : [];
            const currentHidden = Array.isArray(settingsState.draft.readerSettings.hiddenBtns)
                ? settingsState.draft.readerSettings.hiddenBtns.slice()
                : [];
            const index = currentPins.indexOf(id);
            if (index >= 0) {
                currentPins.splice(index, 1);
            } else {
                if (!currentHidden.includes(id)) currentPins.push(id);
            }
            settingsState.draft.readerSettings.pinnedBtns = currentPins;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('toolbar-toggle-visible:')) {
            const id = normalizedAction.slice('toolbar-toggle-visible:'.length);
            const allowed = TOOLBAR_ACTIONS.some(([actionId]) => actionId === id);
            if (!allowed) return { ok: false, reason: 'unknown-toolbar-btn', id };
            const currentHidden = Array.isArray(settingsState.draft.readerSettings.hiddenBtns)
                ? settingsState.draft.readerSettings.hiddenBtns.slice()
                : [];
            const idx = currentHidden.indexOf(id);
            if (idx >= 0) {
                currentHidden.splice(idx, 1);
            } else {
                currentHidden.push(id);
                const currentPins = Array.isArray(settingsState.draft.readerSettings.pinnedBtns)
                    ? settingsState.draft.readerSettings.pinnedBtns.slice()
                    : [];
                const pinIdx = currentPins.indexOf(id);
                if (pinIdx >= 0) {
                    currentPins.splice(pinIdx, 1);
                    settingsState.draft.readerSettings.pinnedBtns = currentPins;
                }
            }
            settingsState.draft.readerSettings.hiddenBtns = currentHidden;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('toolbar-move-up:')) {
            const id = normalizedAction.slice('toolbar-move-up:'.length);
            const order = Array.isArray(settingsState.draft.readerSettings.btnOrder)
                ? settingsState.draft.readerSettings.btnOrder.slice()
                : TOOLBAR_ACTIONS.map(([actionId]) => actionId);
            const currentIndex = order.indexOf(id);
            if (currentIndex <= 0) return { ok: true, reason: 'already-first' };
            [order[currentIndex - 1], order[currentIndex]] = [order[currentIndex], order[currentIndex - 1]];
            settingsState.draft.readerSettings.btnOrder = order;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction === 'reset-prompt-rule') {
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.promptRule = DEFAULT_SCENE_PROMPT_RULE;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction === 'scene-add-bg') {
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
            const existingKeys = Object.keys(settingsState.draft.bridge.sceneAssets.scenes);
            const newName = '场景' + (existingKeys.length + 1);
            settingsState.draft.bridge.sceneAssets.scenes[newName] = '';
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-remove-bg:')) {
            const name = normalizedAction.slice('scene-remove-bg:'.length);
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
            delete settingsState.draft.bridge.sceneAssets.scenes[name];
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction === 'scene-add-char') {
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
            const existingKeys = Object.keys(settingsState.draft.bridge.sceneAssets.characters);
            const newName = '角色' + (existingKeys.length + 1);
            settingsState.draft.bridge.sceneAssets.characters[newName] = { '默认': '' };
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-remove-char:')) {
            const name = normalizedAction.slice('scene-remove-char:'.length);
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
            delete settingsState.draft.bridge.sceneAssets.characters[name];
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-add-mood:')) {
            const charName = normalizedAction.slice('scene-add-mood:'.length);
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
            const char = settingsState.draft.bridge.sceneAssets.characters[charName];
            if (char && typeof char === 'object') {
                const existingMoods = Object.keys(char);
                const newMood = '情绪' + (existingMoods.length + 1);
                char[newMood] = '';
            }
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-remove-mood:')) {
            const rest = normalizedAction.slice('scene-remove-mood:'.length);
            const colonIdx = rest.indexOf(':');
            if (colonIdx > 0) {
                const charName = rest.slice(0, colonIdx);
                const mood = rest.slice(colonIdx + 1);
                settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
                const char = settingsState.draft.bridge.sceneAssets.characters[charName];
                if (char && typeof char === 'object') delete char[mood];
            }
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-set-bg-url:')) {
            const rest = normalizedAction.slice('scene-set-bg-url:'.length);
            const colonIdx = rest.indexOf(':');
            if (colonIdx > 0) {
                const name = rest.slice(0, colonIdx);
                const url = rest.slice(colonIdx + 1);
                settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                settingsState.draft.bridge.sceneAssets.scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
                settingsState.draft.bridge.sceneAssets.scenes[name] = url;
                persistSettingsDraft();
            }
            return { ok: true };
        }

        if (normalizedAction.startsWith('scene-set-mood-url:')) {
            const rest = normalizedAction.slice('scene-set-mood-url:'.length);
            const firstColon = rest.indexOf(':');
            if (firstColon > 0) {
                const charName = rest.slice(0, firstColon);
                const afterChar = rest.slice(firstColon + 1);
                const secondColon = afterChar.indexOf(':');
                if (secondColon > 0) {
                    const mood = afterChar.slice(0, secondColon);
                    const url = afterChar.slice(secondColon + 1);
                    settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                    settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
                    if (!settingsState.draft.bridge.sceneAssets.characters[charName]) {
                        settingsState.draft.bridge.sceneAssets.characters[charName] = {};
                    }
                    settingsState.draft.bridge.sceneAssets.characters[charName][mood] = url;
                    persistSettingsDraft();
                }
            }
            return { ok: true };
        }

        if (normalizedAction.startsWith('scene-rename-bg:')) {
            const oldName = normalizedAction.slice('scene-rename-bg:'.length);
            const globalObj = options.global || globalThis;
            const newName = (globalObj.prompt && globalObj.prompt(`重命名场景「${oldName}」为：`, oldName) || '').trim();
            if (newName && newName !== oldName) {
                settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                const scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
                scenes[newName] = scenes[oldName] || '';
                delete scenes[oldName];
                settingsState.draft.bridge.sceneAssets.scenes = scenes;
                const persisted = persistSettingsDraft();
                if (persisted.ok === false) return persisted;
            }
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-rename-char:')) {
            const oldName = normalizedAction.slice('scene-rename-char:'.length);
            const globalObj = options.global || globalThis;
            const newName = (globalObj.prompt && globalObj.prompt(`重命名角色「${oldName}」为：`, oldName) || '').trim();
            if (newName && newName !== oldName) {
                settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                const chars = settingsState.draft.bridge.sceneAssets.characters || {};
                chars[newName] = chars[oldName] || {};
                delete chars[oldName];
                settingsState.draft.bridge.sceneAssets.characters = chars;
                const persisted = persistSettingsDraft();
                if (persisted.ok === false) return persisted;
            }
            return rerenderSettings();
        }

        if (normalizedAction.startsWith('scene-rename-mood:')) {
            const rest = normalizedAction.slice('scene-rename-mood:'.length);
            const colonIdx = rest.indexOf(':');
            if (colonIdx > 0) {
                const charName = rest.slice(0, colonIdx);
                const oldMood = rest.slice(colonIdx + 1);
                const globalObj = options.global || globalThis;
                const newMood = (globalObj.prompt && globalObj.prompt(`重命名情绪「${oldMood}」为：`, oldMood) || '').trim();
                if (newMood && newMood !== oldMood) {
                    settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                    const chars = settingsState.draft.bridge.sceneAssets.characters || {};
                    if (chars[charName]) {
                        chars[charName][newMood] = chars[charName][oldMood] || '';
                        delete chars[charName][oldMood];
                        const persisted = persistSettingsDraft();
                        if (persisted.ok === false) return persisted;
                    }
                }
            }
            return rerenderSettings();
        }

        return { ok: false, reason: 'unknown-settings-action', action: normalizedAction };
    }

    async function handleReaderAction(action) {
        if (!state.activeReader) return { ok: false, reason: 'reader-not-open' };
        const normalizedAction = String(action || '').trim();
        state.activeReader.lastAction = normalizedAction;

        if (normalizedAction === 'settings') {
            return state.activeReader.controller.openSettings('basic');
        }
        if (normalizedAction === 'hide') {
            return state.activeReader.controller.toggleHidden();
        }
        if (normalizedAction === 'close') {
            return state.activeReader.controller.close();
        }
        if (normalizedAction === 'toggle-bar') {
            return state.activeReader.controller.toggleToolbar();
        }
        if (normalizedAction === 'prev') {
            return moveReaderSegment(-1);
        }
        if (normalizedAction === 'next') {
            return moveReaderSegment(1);
        }
        if (normalizedAction === 'regen') {
            return regenerateCurrentImage();
        }
        if (normalizedAction === 'rescan') {
            return rescanCurrentImages();
        }
        if (normalizedAction === 'save') {
            return saveCurrentImage();
        }
        if (['prev-turn', 'next-turn'].includes(normalizedAction)) {
            return moveReaderTurn(normalizedAction === 'prev-turn' ? -1 : 1);
        }
        if (normalizedAction === 'sprite-edit') {
            const overlay = state.activeReader.dom && state.activeReader.dom.overlay;
            if (overlay) enterSpriteEditMode(overlay, state.activeReader);
            return { ok: true };
        }

        return { ok: false, reason: 'unknown-reader-action', action: normalizedAction };
    }

    function moveReaderSegment(delta) {
        if (!state.activeReader) return { ok: false, reason: 'reader-not-open' };
        const segments = state.activeReader.snapshot && state.activeReader.snapshot.content
            ? state.activeReader.snapshot.content.segments || []
            : [];
        const maxIndex = Math.max(0, segments.length - 1);
        const nextIndex = Math.max(0, Math.min(maxIndex, Number(state.activeReader.index || 0) + delta));
        if (nextIndex === state.activeReader.index) {
            writeToast(delta > 0 ? '已经是最后一段' : '已经是第一段');
            return {
                ok: true,
                moved: false,
                index: state.activeReader.index,
                progress: state.activeReader.snapshot && state.activeReader.snapshot.content
                    ? state.activeReader.snapshot.content.progress
                    : '',
            };
        }
        state.activeReader.index = nextIndex;
        rerenderActiveReader();
        return {
            ok: true,
            moved: true,
            index: state.activeReader.index,
            progress: state.activeReader.snapshot.content.progress,
        };
    }

    function rerenderActiveReader() {
        if (!state.activeReader) return { ok: true, reason: 'reader-not-open' };
        const unified = resolveBridgeConfigSnapshot({ mode: state.activeReader.mode });
        const nextMode = normalizeReaderMode(
            firstDefined(unified.bridge.openMode, state.activeReader.mode),
            unified.bridge,
        );
        state.activeReader.mode = nextMode;
        const readerSettings = normalizeReaderSettings(nextMode, unified.readerSettings);
        readerSettings._sceneAssets = unified.bridge.sceneAssets || null;
        state.activeReader.snapshot = buildReaderSnapshot(state.activeReader.payload, nextMode, readerSettings, state.activeReader.index);
        updateMountedReader(state.activeReader.snapshot);
        return { ok: true };
    }

    async function moveReaderTurn(delta) {
        const current = state.activeReader;
        if (!current) return { ok: false, reason: 'reader-not-open' };
        const currentMessageId = current.snapshot && current.snapshot.messageId;
        const getAdjacentMessage = typeof options.getAdjacentMessage === 'function'
            ? options.getAdjacentMessage
            : null;
        if (currentMessageId == null || !getAdjacentMessage) {
            writeToast('楼层切换需要宿主消息列表。');
            return { ok: true, moved: false, reason: 'turn-switch-host-required' };
        }
        const target = await getAdjacentMessage(currentMessageId, delta);
        if (!target) {
            writeToast(delta > 0 ? '没有下一轮' : '没有上一轮');
            return { ok: true, moved: false, reason: 'turn-not-found', messageId: currentMessageId };
        }
        if (typeof options.jumpToMessage === 'function') {
            try {
                await options.jumpToMessage(target.id);
            } catch (error) {
                // 宿主跳转失败不阻断阅读器切层。
            }
        }
        if (typeof options.openViewerFromMessage !== 'function') {
            return { ok: false, reason: 'missing-open-viewer-handler', messageId: target.id };
        }
        const result = await options.openViewerFromMessage(target.id, current.mode, {
            startAtEnd: delta < 0,
            message: target,
        });
        if (result && result.ok !== false) {
            writeToast(delta > 0 ? '已切到下一轮' : '已切到上一轮');
            return { ok: true, moved: true, messageId: target.id, reader: result.reader };
        }
        return {
            ok: false,
            moved: false,
            reason: result && result.reason || 'turn-open-failed',
            messageId: target.id,
        };
    }

    async function regenerateCurrentImage() {
        const current = state.activeReader;
        if (!current) return { ok: false, reason: 'reader-not-open' };
        if (typeof options.regenerateImage !== 'function') {
            writeToast('当前未接入图片重画能力。');
            return { ok: false, reason: 'provider-not-enabled' };
        }

        const result = await options.regenerateImage(buildImageActionContext(
            current,
            resolveBridgeConfigSnapshot({ mode: current.mode }),
        ));
        if (result && result.imageState && state.activeReader) {
            state.activeReader.payload.imageState = cloneData(result.imageState);
            rerenderActiveReader();
        }
        writeToast(resolveReaderActionToast(result, {
            success: '背景图已更新。',
            fallback: '当前未检测到新的背景图。',
        }));
        return result;
    }

    async function rescanCurrentImages() {
        const current = state.activeReader;
        if (!current) return { ok: false, reason: 'reader-not-open' };
        if (typeof options.collectMessageImages !== 'function') {
            writeToast('图片收集不可用。');
            return { ok: false, reason: 'collect-not-available' };
        }
        const overlay = current.dom && current.dom.root || (options.global || globalThis).document && (options.global || globalThis).document.querySelector('#vn-overlay');
        const bgContainer = overlay && overlay.querySelector('#vn-bg');
        ensureImageLoadingSpinner(bgContainer);

        const context = buildImageActionContext(current, resolveBridgeConfigSnapshot({ mode: current.mode }));
        const result = await options.collectMessageImages({
            ...context,
            messageId: current.snapshot && current.snapshot.messageId,
            preferredImageIndex: context.imageIndex,
            skipCache: true,
            requiresMessageScope: Array.isArray(context.imageState && context.imageState.slots)
                && context.imageState.slots.length > 0,
        });

        removeImageLoadingSpinner(bgContainer);
        if (!result || result.ok === false) {
            writeToast('未扫描到图片。');
            return result || { ok: false, reason: 'rescan-failed' };
        }
        const nextBoundCount = countBoundImageSlots(result);
        current.payload.imageState = cloneData(result);
        rerenderActiveReader();
        writeToast(`已刷新：绑定 ${nextBoundCount}/${result.expectedCount || result.count || 0} 张图。`);
        return { ok: true, boundCount: nextBoundCount, imageState: result };
    }

    async function saveCurrentImage() {
        const current = state.activeReader;
        if (!current) return { ok: false, reason: 'reader-not-open' };
        const context = buildImageActionContext(
            current,
            resolveBridgeConfigSnapshot({ mode: current.mode }),
        );
        const saveImage = typeof options.saveImage === 'function'
            ? options.saveImage
            : async () => ({ ok: false, reason: 'missing-save-handler' });
        const result = await saveImage({
            ...context,
            url: context.currentUrl,
        });
        writeToast(resolveReaderActionToast(result, {
            success: '背景图保存命令已发出。',
            fallback: '当前背景图不可保存。',
        }));
        return result;
    }

    function startReaderImagePolling(current) {
        if (!current || typeof options.collectMessageImages !== 'function') return;
        if (!shouldPollReaderImages(current.snapshot && current.snapshot.content)) return;
        const token = (current.imagePollToken || 0) + 1;
        current.imagePollToken = token;
        pollReaderImages(current, token);
    }

    async function pollReaderImages(current, token) {
        const unified = resolveBridgeConfigSnapshot({ mode: current.mode });
        const imageApi = unified.bridge && unified.bridge.imageApi || {};
        const intervalMs = normalizePollInterval(imageApi.initialPollIntervalMs || imageApi.pollIntervalMs);
        const attempts = normalizePollAttempts(imageApi.initialPollAttempts);
        let previousSignature = String(current.snapshot && current.snapshot.content && current.snapshot.content.imageSignature || '');
        let previousBoundCount = Number(current.snapshot && current.snapshot.content && current.snapshot.content.imageBoundCount || 0) || 0;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            await waitForReaderImagePoll(intervalMs, options.global);
            if (!state.activeReader || state.activeReader !== current || current.imagePollToken !== token) return;
            const context = buildImageActionContext(current, resolveBridgeConfigSnapshot({ mode: current.mode }));
            const result = await options.collectMessageImages({
                ...context,
                messageId: current.snapshot && current.snapshot.messageId,
                preferredImageIndex: context.imageIndex,
                requiresMessageScope: Array.isArray(context.imageState && context.imageState.slots)
                    && context.imageState.slots.length > 0,
            });
            if (!result || result.ok === false) continue;
            const nextBoundCount = countBoundImageSlots(result);
            const nextSignature = String(result.signature || '');
            const currentUrl = String(result.currentUrl || result.displayUrl || '').trim();
            if (nextSignature !== previousSignature || nextBoundCount > previousBoundCount || currentUrl) {
                current.payload.imageState = cloneData(result);
                rerenderActiveReader();
                previousSignature = nextSignature;
                previousBoundCount = nextBoundCount;
                if (!shouldPollReaderImages(current.snapshot && current.snapshot.content)) return;
            }
        }
    }

    function buildReaderSnapshot(payload, mode, readerSettings, index = 0) {
        const scene = cloneData(payload.scene || (payload.render && payload.render.scene) || {});
        const render = payload.render || {};
        const stage = render.stage || {};
        const extracted = buildVisualNovelTextPayload(payload.message || payload.raw || '', {
            sourceFilter: payload.sourceFilter,
            virtualRegex: payload.virtualRegex,
            visibleText: payload.visibleText,
            sceneAssets: readerSettings._sceneAssets,
        });
        const text = firstRenderableText(
            scene.text,
            scene.formattedText,
            payload.formattedText,
            extracted.formattedText,
            extracted.visibleText,
            extracted.cleanedRaw,
            getMessagePrimaryText(payload.message),
            payload.raw,
        );
        const segments = Array.isArray(payload.textSegments) && payload.textSegments.length
            ? cloneData(payload.textSegments)
            : buildTextSegments(text);
        const normalizedIndex = Math.max(0, Math.min(segments.length - 1, Number(index) || 0));
        const imageState = normalizeSnapshotImageState(
            payload.imageState,
            resolveSegmentImageIndex(payload, normalizedIndex),
        );
        const displayImageState = applyImageCountOverride(imageState, readerSettings.imageCountOverride);
        const currentText = segments[normalizedIndex] || text;
        const displayText = scene.speaker && currentText
            ? `${scene.speaker}: ${currentText}`
            : currentText;
        const backgroundImage = firstNonEmptyString(
            displayImageState.displayUrl,
            displayImageState.currentUrl,
            scene.generatedImage && scene.generatedImage.value,
            stage.layers && stage.layers.generated && stage.layers.generated.resource && stage.layers.generated.resource.value,
            stage.layers && stage.layers.background && stage.layers.background.resource && stage.layers.background.resource.url,
            '',
        );
        const sceneAssets = readerSettings._sceneAssets || null;
        const sceneDirectives = Array.isArray(extracted.sceneDirectives) ? extracted.sceneDirectives
            : Array.isArray(payload.sceneDirectives) ? payload.sceneDirectives : [];
        let finalBackgroundImage = backgroundImage;
        let spriteImage = null;
        const extractedSegmentImageSlots = Array.isArray(extracted.segmentImageSlots) ? extracted.segmentImageSlots : [];
        const rawSegmentSlotValue = extractedSegmentImageSlots[normalizedIndex];
        const segmentHasBoundSlot = rawSegmentSlotValue != null
            && Number.isFinite(Number(rawSegmentSlotValue))
            && Number(rawSegmentSlotValue) >= 0;
        const slotBoundUrl = segmentHasBoundSlot
            && Array.isArray(displayImageState.slots)
            && displayImageState.slots[Math.floor(Number(rawSegmentSlotValue))]
            ? String(displayImageState.slots[Math.floor(Number(rawSegmentSlotValue))].url || '').trim()
            : '';
        if (slotBoundUrl) {
            finalBackgroundImage = slotBoundUrl;
            spriteImage = null;
        } else if (sceneAssets && sceneAssets.enabled) {
            if (sceneDirectives.length) {
                const sceneState = resolveSceneStateAtIndex(sceneDirectives, normalizedIndex);
                const assetUrls = lookupSceneAssetUrls(sceneState, sceneAssets);
                finalBackgroundImage = assetUrls.backgroundUrl || '';
                spriteImage = assetUrls.spriteUrl || null;
            } else {
                finalBackgroundImage = '';
                spriteImage = null;
            }
        }
        const overlayClasses = ['vn-mode-' + mode];
        if (mode === 'pc' || mode === 'mobile') overlayClasses.push('vn-floating');
        if (mode === 'mobile') overlayClasses.push('vn-floating-mobile');

        return {
            mode,
            messageId: firstDefined(payload.messageId, payload.message && payload.message.id, scene.messageId, null),
            selectors: Array.from(ORIGINAL_READER_REQUIRED_SELECTORS),
            classes: overlayClasses,
            styles: {
                '#vn-overlay': {
                    zIndex: ORIGINAL_READER_STYLE_CONTRACT.overlayZIndex,
                    background: '#000',
                },
                '.vn-dialog': {
                    width: ORIGINAL_READER_STYLE_CONTRACT.dialogWidth,
                    borderRadius: '22px',
                    padding: '22px 26px 18px',
                },
                '.vn-input': {
                    height: ORIGINAL_READER_STYLE_CONTRACT.inputHeight,
                },
                '.vn-send-btn': {
                    minWidth: ORIGINAL_READER_STYLE_CONTRACT.sendButtonMinWidth,
                },
                '.vn-icon-btn': {
                    width: ORIGINAL_READER_STYLE_CONTRACT.toolbarButtonSize,
                    height: ORIGINAL_READER_STYLE_CONTRACT.toolbarButtonSize,
                },
                '#vn-sprite': {
                    display: spriteImage ? 'block' : 'none',
                },
            },
            content: {
                speaker: scene.speaker || '',
                text: currentText,
                fullText: text,
                displayText,
                segments: cloneData(segments),
                currentIndex: normalizedIndex,
                progress: buildProgressText(normalizedIndex, segments.length, displayImageState),
                backgroundImage: finalBackgroundImage,
                spriteImage,
                images: cloneData(displayImageState.images),
                imageSlots: cloneData(displayImageState.slots),
                unboundImages: cloneData(displayImageState.unboundImages),
                imageCount: displayImageState.count,
                imageExpectedCount: displayImageState.expectedCount,
                imageBoundCount: displayImageState.boundCount,
                imageUnboundCount: displayImageState.unboundCount,
                imageAvailableCount: displayImageState.availableCount,
                imageSignature: displayImageState.signature,
                activeImageIndex: displayImageState.currentIndex,
                currentImageUrl: displayImageState.displayUrl || displayImageState.currentUrl,
                currentSlotImageUrl: displayImageState.slotUrl,
                sourceKind: firstDefined(scene.sourceKind, payload.sourceKind, 'raw-text'),
                warnings: extracted.warnings,
                errors: extracted.errors,
            },
            readerSettings: cloneData(readerSettings),
            input: {
                placeholder: '输入内容后按 Enter 发送',
                enterSends: true,
                shiftEnterSends: false,
            },
            html: `<div id="vn-overlay" class="${overlayClasses.join(' ')}" data-vn-vn-ui="true">${getOriginalReaderHtml()}</div>`,
            source: getOriginalReaderSource(options.version || '0.5.4'),
        };
    }

    function buildSettingsSnapshot(settingsState) {
        const draft = normalizeUnifiedSettings(settingsState.draft, settingsState.readerMode);
        const tab = normalizeSettingsTab(settingsState.tab);
        const body = renderSettingsBody(tab, draft, settingsState.asyncState);
        const tabsHtml = SETTINGS_TAB_DEFS.map(([id, label]) => {
            return `<button type="button" class="vn-settings-tab${tab === id ? ' is-active' : ''}" data-tab="${id}">${label}</button>`;
        }).join('');

        return {
            tab,
            readerMode: settingsState.readerMode,
            selectors: Array.from(SETTINGS_PANEL_REQUIRED_SELECTORS),
            tabs: SETTINGS_TAB_DEFS.map(([id, label]) => ({
                id,
                label,
                active: id === tab,
                requiredPaths: Array.from((SETTINGS_PANEL_TAB_CONTRACT[id] || {}).requiredPaths || []),
                requiredActions: Array.from((SETTINGS_PANEL_TAB_CONTRACT[id] || {}).requiredActions || []),
            })),
            activeContract: SETTINGS_PANEL_TAB_CONTRACT[tab],
            html: `<div id="vn-unified-settings" data-vn-vn-ui="true">${renderTemplate(getSettingsShellTemplate(), {
                version: esc(options.version || '0.5.4'),
                tabs: tabsHtml,
                body,
            })}</div>`,
            resultText: {
                image: settingsState.asyncState.imageResult || '',
                imageModels: settingsState.asyncState.imageModelsMessage || '',
                virtualRegex: settingsState.asyncState.virtualRegexPreview || '',
            },
            draft,
        };
    }

    function renderSettingsBody(tab, draft, asyncState) {
        const bridge = draft.bridge;
        const imageApi = bridge.imageApi;
        const sourceFilter = bridge.sourceFilter;
        const reader = draft.readerSettings;

        if (tab === 'basic') {
            return renderTemplate(getSettingsTabTemplate('basic'), {
                openModeField: `<div class="vn-settings-full vn-segmented-field">${field(
                    'bridge.openMode',
                    '切换模式',
                    segmentedInput(
                        'bridge.openMode',
                        bridge.openMode,
                        [
                            ['pc', '电脑', getReaderModeIcon('pc')],
                            ['mobile', '手机', getReaderModeIcon('mobile')],
                            ['web', '网页全屏', getReaderModeIcon('web')],
                            ['fullscreen', '全屏', getReaderModeIcon('fullscreen')],
                        ],
                        '切换模式',
                    ),
                )}</div>`,
                settingsToggles: checkbox('bridge.showToasts', bridge.showToasts, '显示提示 toast')
                    + checkbox('bridge.debug', bridge.debug, '调试日志'),
            });
        }

        if (tab === 'regex') {
            return renderTemplate(getSettingsTabTemplate('regex'), {
                filterToggles: checkbox('bridge.sourceFilter.enabled', sourceFilter.enabled, '启用标签筛选')
                    + checkbox('bridge.sourceFilter.stripHtmlComments', sourceFilter.stripHtmlComments, '排除 HTML 注释'),
                untaggedToggle: checkbox(
                    'bridge.sourceFilter.allowUntaggedFallback',
                    sourceFilter.allowUntaggedFallback,
                    '正文保留标签为空时读取清洗全文',
                ),
                textIncludeField: field('bridge.sourceFilter.textIncludeTags', '正文保留标签', textareaInput('bridge.sourceFilter.textIncludeTags', sourceFilter.textIncludeTags, 'content')),
                textExcludeField: field('bridge.sourceFilter.textExcludeTags', '正文排除标签', textareaInput('bridge.sourceFilter.textExcludeTags', sourceFilter.textExcludeTags)),
                imageIncludeField: field('bridge.sourceFilter.imageIncludeTags', '图片保留标签', textareaInput('bridge.sourceFilter.imageIncludeTags', sourceFilter.imageIncludeTags, 'image&#10;text_to_image')),
                regexToggle: checkbox('bridge.virtualRegex.enabled', bridge.virtualRegex.enabled, '启用正文格式化'),
                regexPatternField: field('bridge.virtualRegex.pattern', '查找表达式', textareaInput('bridge.virtualRegex.pattern', bridge.virtualRegex.pattern, '^@bubble:([^|\\n]+)\\|[^|\\n]*\\|\\[?([^\\n]*?)\\]?$')),
                regexFlagsField: field('bridge.virtualRegex.flags', 'flags', textInput('bridge.virtualRegex.flags', bridge.virtualRegex.flags, 'i'), '例如 i、g、s、m；留空表示无 flags。'),
                regexReplacementField: field('bridge.virtualRegex.replacement', '替换文本', textareaInput('bridge.virtualRegex.replacement', bridge.virtualRegex.replacement, '[$1]：$2')),
                regexPreview: esc(asyncState.virtualRegexPreview || '点击“测试当前楼层”预览最终 VN 正文。'),
            });
        }

        if (tab === 'image') {
            const apiDisabled = imageApi.mode !== 'nai';
            const imageModeNote = imageApi.mode === 'nai'
                ? '内置模式会直接调用图像 API，不再依赖外部插图扩展。'
                : '外部扩展模式会优先按适配器检测 chatu8 / chami。';
            const promptPrefixInput = `<textarea data-path="bridge.imageApi.promptPrefix" placeholder="可选，生成图片时追加到正文前"${disabledAttr(apiDisabled)}>${esc(imageApi.promptPrefix || '')}</textarea>`;
            return renderTemplate(getSettingsTabTemplate('image'), {
                imageModeField: field('bridge.imageApi.mode', '图像模式', selectInput('bridge.imageApi.mode', imageApi.mode, [['extension', '使用现有插图扩展'], ['nai', 'VN 内置 NAI API']])),
                adapterField: field('bridge.imageApi.externalAdapter', '插图扩展', selectInput('bridge.imageApi.externalAdapter', imageApi.externalAdapter, [['auto', '自动检测'], ['chatu8', 'st-chatu8 / chatu8'], ['chami', 'chami_tavern-scene-plugin']], imageApi.mode === 'nai'), imageModeNote),
                apiGroupClass: 'vn-settings-api-group' + (apiDisabled ? ' is-disabled' : ''),
                endpointField: field('bridge.imageApi.endpoint', '图像 API 地址', textInput('bridge.imageApi.endpoint', imageApi.endpoint, 'https://...', 'text', apiDisabled), apiDisabled ? '内置 NAI API 模式启用时可编辑。' : ''),
                apiKeyField: field('bridge.imageApi.apiKey', 'API Key', secretInput('bridge.imageApi.apiKey', imageApi.apiKey, '留空则不发送 Authorization', apiDisabled)),
                modelField: field('bridge.imageApi.model', '模型', modelPicker('bridge.imageApi.model', imageApi.model, imageApi.availableModels, 'fetch-image-models', 'nai-diffusion-3', apiDisabled)),
                sizeField: field('bridge.imageApi.size', '尺寸', textInput('bridge.imageApi.size', imageApi.size, '832x1216', 'text', apiDisabled)),
                stepsField: field('bridge.imageApi.steps', '步数', numberInput('bridge.imageApi.steps', imageApi.steps, 1, 100, apiDisabled)),
                samplerField: field('bridge.imageApi.sampler', '采样器', textInput('bridge.imageApi.sampler', imageApi.sampler, 'k_euler_ancestral', 'text', apiDisabled)),
                timeoutField: field('bridge.imageApi.requestTimeoutMs', '请求超时 ms', numberInput('bridge.imageApi.requestTimeoutMs', imageApi.requestTimeoutMs, 5000, 300000, apiDisabled)),
                pollIntervalField: field('bridge.imageApi.pollIntervalMs', '轮询间隔 ms', numberInput('bridge.imageApi.pollIntervalMs', imageApi.pollIntervalMs, 500, 30000, apiDisabled)),
                pollAttemptsField: field('bridge.imageApi.pollAttempts', '轮询次数', numberInput('bridge.imageApi.pollAttempts', imageApi.pollAttempts, 1, 240, apiDisabled)),
                promptPrefixField: field('bridge.imageApi.promptPrefix', '图像提示词前缀', promptPrefixInput),
                imageModelsMessage: esc(asyncState.imageModelsMessage || (apiDisabled ? '使用现有插图扩展时无需拉取内置 API 模型；检测插件会检查 chatu8 / chami 链路。' : '可手填模型，也可点击拉取模型获取候选列表。')),
                imageTestActionLabel: imageApi.mode === 'nai' ? '测试生成' : '检测插件',
                imageTestHelp: esc(asyncState.imageResult || (imageApi.mode === 'nai' ? '测试会对当前内置 API 发起真实生成请求；建议先填写 endpoint、模型和 key。' : '检测当前页面可用的外部插图扩展与图片/按钮链路。')),
            });
        }

        if (tab === 'scene') {
            const sceneAssets = bridge.sceneAssets || {};
            const disabled = !sceneAssets.enabled;
            const scenesHtml = renderSceneAssetList(sceneAssets.scenes || {});
            const charsHtml = renderCharacterAssetList(sceneAssets.characters || {});
            return renderTemplate(getSettingsTabTemplate('scene'), {
                sceneToggle: checkbox('bridge.sceneAssets.enabled', sceneAssets.enabled, '启用场景素材模式'),
                sceneGroupClass: `vn-settings-section vn-settings-full${disabled ? ' vn-settings-api-group is-disabled' : ''}`,
                promptRuleField: field('bridge.sceneAssets.promptRule', '注入提示词', `<textarea data-path="bridge.sceneAssets.promptRule" placeholder="格式规则..."${disabled ? ' disabled' : ''}>${esc(sceneAssets.promptRule || '')}</textarea>`),
                scenesEditor: scenesHtml,
                charactersEditor: charsHtml,
            });
        }

        return renderTemplate(getSettingsTabTemplate('reader'), {
            readerModeField: field('readerMode', '应用到模式', selectInput('readerMode', draft.readerMode, [['pc', '电脑'], ['mobile', '手机'], ['web', '网页全屏'], ['fullscreen', '全屏']])),
            fontSizeField: field('readerSettings.fontSize', '字体大小', selectInput('readerSettings.fontSize', reader.fontSize, [12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30].map((n) => [n, `${n}px`]))),
            dialogWidthField: field('readerSettings.dialogWidth', '对话框宽度', selectInput('readerSettings.dialogWidth', reader.dialogWidth === null ? 'null' : reader.dialogWidth, [['null', '自动'], [200, '200px'], [280, '280px'], [360, '360px'], [440, '440px'], [520, '520px'], [600, '600px'], [680, '680px'], [760, '760px'], [840, '840px'], [920, '920px'], [1000, '1000px'], [1080, '1080px'], [1160, '1160px'], [1280, '1280px']])),
            dialogHeightField: field('readerSettings.dialogHeight', '对话框高度', selectInput('readerSettings.dialogHeight', reader.dialogHeight === null ? 'null' : reader.dialogHeight, [['null', '自适应'], [10, '10px'], [20, '20px'], [40, '40px'], [60, '60px'], [90, '90px'], [130, '130px'], [160, '160px'], [200, '200px'], [250, '250px'], [300, '300px'], [400, '400px'], [500, '500px'], [600, '600px']])),
            glassOpacityField: field('readerSettings.glassOpacity', '毛玻璃浓度', selectInput('readerSettings.glassOpacity', reader.glassOpacity, [0, .1, .2, .35, .5, .62, .74, .88, 1].map((n) => [n, `${Math.round(n * 100)}%`]))),
            imageCountField: field('readerSettings.imageCountOverride', '检测图像数量', selectInput('readerSettings.imageCountOverride', reader.imageCountOverride === null ? 'null' : reader.imageCountOverride, [['null', '自动']].concat(Array.from({ length: 20 }, (_, index) => [index + 1, `${index + 1}张`])))),
            inputScaleField: field('readerSettings.inputScale', '输入框高度', selectInput('readerSettings.inputScale', reader.inputScale, [20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((n) => [n, `${n}%`]))),
            toolbarScaleField: field('readerSettings.toolbarScale', '工具栏大小', selectInput('readerSettings.toolbarScale', reader.toolbarScale, [20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((n) => [n, `${n}%`]))),
            imgModeField: field('readerSettings.imgMode', '图像显示模式', selectInput('readerSettings.imgMode', reader.imgMode, [['adaptive', '自适应'], ['contain', '完整']])),
            readerToggles: checkbox('readerSettings.stayMode', reader.stayMode, '留在当前模式'),
            pinnedButtonsField: renderPinnedButtons(reader.pinnedBtns, reader.hiddenBtns, reader.btnOrder),
        });
    }

    function mountReaderDom(snapshot, controller) {
        const doc = getRootDocument(options.global);
        if (!doc) return null;
        ensureStyleTag(doc, 'vn-overlay-style', getOriginalReaderStyleText());
        const existing = doc.getElementById('vn-overlay');
        if (existing) existing.remove();

        const root = doc.createElement('div');
        doc.body.appendChild(root);
        root.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-act]');
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            const action = button.getAttribute('data-act');
            await controller.invokeAction(action);
        });
        root.addEventListener('keydown', async (event) => {
            if (event.target && event.target.id === 'vn-input') {
                const result = await controller.keydown({
                    key: event.key,
                    shiftKey: event.shiftKey,
                    value: event.target.value,
                });
                if (result.sent) {
                    event.preventDefault();
                }
            }
        });
        const keydownHandler = (event) => {
            if (!state.activeReader) return;
            const input = state.activeReader.dom && state.activeReader.dom.input;
            if (doc.activeElement === input && event.key !== 'Escape') return;
            if (event.key === 'Escape') {
                event.preventDefault();
                controller.close();
                return;
            }
            if (event.key === 'ArrowRight' || event.key === ' ') {
                event.preventDefault();
                controller.invokeAction('next');
                return;
            }
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                controller.invokeAction('prev');
                return;
            }
            if (event.key === 'h' || event.key === 'H') {
                event.preventDefault();
                controller.invokeAction('hide');
            }
        };
        if (typeof doc.addEventListener === 'function') {
            doc.addEventListener('keydown', keydownHandler, true);
        }
        return {
            root,
            doc,
            dispose() {
                if (typeof doc.removeEventListener === 'function') {
                    doc.removeEventListener('keydown', keydownHandler, true);
                }
            },
        };
    }

    function mountSettingsDom(controller) {
        const doc = getRootDocument(options.global);
        if (!doc) return null;
        ensureStyleTag(doc, 'vn-unified-settings-style', getSettingsStyleText());
        const existing = doc.getElementById('vn-unified-settings');
        if (existing) existing.remove();

        const root = doc.createElement('div');
        doc.body.appendChild(root);
        root.addEventListener('click', async (event) => {
            const tab = event.target.closest('[data-tab]');
            if (tab) {
                controller.switchTab(tab.getAttribute('data-tab'));
                return;
            }
            const sw = event.target.closest('[data-switch]');
            if (sw) {
                controller.toggle(sw.getAttribute('data-switch'));
                return;
            }
            const segment = event.target.closest('[data-segment-path]');
            if (segment) {
                controller.setValue(segment.getAttribute('data-segment-path'), segment.getAttribute('data-segment-value'));
                return;
            }
            const action = event.target.closest('[data-action]');
            if (action) {
                if (action.getAttribute('data-action') === 'toggle-secret') {
                    const wrap = action.closest('.vn-settings-secret');
                    const input = wrap ? wrap.querySelector('input') : null;
                    if (input) {
                        const show = input.type === 'password';
                        input.type = show ? 'text' : 'password';
                        action.textContent = show ? '隐藏' : '显示';
                        action.setAttribute('aria-pressed', show ? 'true' : 'false');
                    }
                    return;
                }
                event.preventDefault();
                await controller.invoke(action.getAttribute('data-action'));
                return;
            }
        });
        root.addEventListener('input', (event) => {
            const target = event.target;
            if (!target || !target.getAttribute) return;
            const path = target.getAttribute('data-path');
            if (path) {
                controller.setValue(path, target.value);
                return;
            }
            const sceneBg = target.getAttribute('data-scene-bg');
            if (sceneBg) {
                controller.invoke('scene-set-bg-url:' + sceneBg + ':' + target.value);
                return;
            }
            const sceneChar = target.getAttribute('data-scene-char');
            const sceneMood = target.getAttribute('data-scene-mood');
            if (sceneChar && sceneMood) {
                controller.invoke('scene-set-mood-url:' + sceneChar + ':' + sceneMood + ':' + target.value);
            }
        });
        root.addEventListener('change', (event) => {
            const modelSync = event.target && event.target.getAttribute ? event.target.getAttribute('data-model-sync') : '';
            if (modelSync) {
                controller.setValue(modelSync, event.target.value);
                return;
            }
            const path = event.target && event.target.getAttribute ? event.target.getAttribute('data-path') : '';
            if (!path) return;
            controller.setValue(path, event.target.value);
        });
        root.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                controller.close();
            }
        });

        const domState = {
            root,
            doc,
            overlay: null,
            viewportHandler: null,
            viewportWindow: null,
            viewportRaf: null,
            dispose() {
                detachSettingsViewportEvents(domState);
            },
        };
        return domState;
    }

    function updateMountedReader(snapshot) {
        const current = state.activeReader;
        if (!current || !current.dom || !current.dom.root) return;
        const refs = hydrateReaderMount(current.dom.root, snapshot);
        current.dom.overlay = refs.overlay;
        current.dom.dialog = refs.dialog;
        current.dom.input = refs.input;
        current.dom.sendButton = refs.sendButton;
        current.dom.toast = refs.toast;
        current.dom.clickLayer = refs.clickLayer;
        current.dom.text = refs.text;
        current.dom.progress = refs.progress;
        if (current.dom.overlay) applyReaderSnapshotToDom(current.dom.overlay, snapshot, current);
    }

    function hydrateReaderMount(container, snapshot) {
        clearChildren(container);
        container.innerHTML = snapshot.html;
        let overlay = container.querySelector('#vn-overlay');
        if (!overlay) {
            overlay = buildFallbackReaderOverlay(container.ownerDocument || getRootDocument(options.global));
            if (overlay) container.appendChild(overlay);
        }
        return {
            overlay,
            dialog: overlay ? overlay.querySelector('#vn-dialog') : null,
            input: overlay ? overlay.querySelector('#vn-input') : null,
            sendButton: overlay ? overlay.querySelector('#vn-send-btn') : null,
            toast: overlay ? overlay.querySelector('#vn-toast') : null,
            clickLayer: overlay ? overlay.querySelector('#vn-click-layer') : null,
            text: overlay ? overlay.querySelector('#vn-text') : null,
            progress: overlay ? overlay.querySelector('#vn-progress') : null,
        };
    }

    function buildFallbackReaderOverlay(doc) {
        if (!doc || typeof doc.createElement !== 'function') return null;
        const overlay = doc.createElement('div');
        overlay.id = 'vn-overlay';

        const bgBlur = doc.createElement('div');
        bgBlur.id = 'vn-bg-blur';
        overlay.appendChild(bgBlur);

        const bg = doc.createElement('div');
        bg.id = 'vn-bg';
        overlay.appendChild(bg);

        const sprite = doc.createElement('div');
        sprite.id = 'vn-sprite';
        overlay.appendChild(sprite);

        const clickLayer = doc.createElement('div');
        clickLayer.id = 'vn-click-layer';
        overlay.appendChild(clickLayer);

        const dialog = doc.createElement('div');
        dialog.id = 'vn-dialog';
        dialog.className = 'vn-dialog';
        overlay.appendChild(dialog);

        const ctrlBar = doc.createElement('div');
        ctrlBar.id = 'vn-ctrl-bar';
        ctrlBar.className = 'vn-ctrl-bar';
        dialog.appendChild(ctrlBar);

        const barBtns = doc.createElement('div');
        barBtns.id = 'vn-bar-btns';
        ctrlBar.appendChild(barBtns);
        for (const button of ORIGINAL_READER_TOOLBAR_BUTTONS) {
            barBtns.appendChild(createReaderButton(doc, button.id, button.title, button.html));
        }

        const settings = doc.createElement('div');
        settings.id = 'vn-settings';
        settings.setAttribute('aria-hidden', 'true');
        ctrlBar.appendChild(settings);

        const pinned = doc.createElement('div');
        pinned.id = 'vn-bar-pinned';
        ctrlBar.appendChild(pinned);

        ctrlBar.appendChild(createReaderButton(doc, 'toggle-bar', '收纳/展开按钮', ORIGINAL_READER_ICONS.toggleBar));
        ctrlBar.appendChild(createReaderButton(doc, 'close', '退出', ORIGINAL_READER_ICONS.close));

        const progress = doc.createElement('div');
        progress.id = 'vn-progress';
        progress.className = 'vn-progress';
        dialog.appendChild(progress);

        const text = doc.createElement('div');
        text.id = 'vn-text';
        text.className = 'vn-text';
        dialog.appendChild(text);

        const controls = doc.createElement('div');
        controls.className = 'vn-controls';
        dialog.appendChild(controls);

        const sendStatus = doc.createElement('div');
        sendStatus.id = 'vn-send-status';
        sendStatus.setAttribute('aria-live', 'polite');
        controls.appendChild(sendStatus);

        const spinner = doc.createElement('span');
        spinner.className = 'vn-spinner';
        sendStatus.appendChild(spinner);

        const sendStatusText = doc.createElement('span');
        sendStatusText.id = 'vn-send-status-text';
        sendStatusText.textContent = '已发送，等待 AI 回复…';
        sendStatus.appendChild(sendStatusText);

        const input = doc.createElement('input');
        input.id = 'vn-input';
        input.className = 'vn-input';
        input.type = 'text';
        input.placeholder = '输入内容后按 Enter 发送';
        controls.appendChild(input);

        const sendButton = doc.createElement('button');
        sendButton.id = 'vn-send-btn';
        sendButton.className = 'vn-send-btn';
        sendButton.type = 'button';
        sendButton.textContent = '发送';
        controls.appendChild(sendButton);

        const toast = doc.createElement('div');
        toast.id = 'vn-toast';
        toast.setAttribute('aria-live', 'polite');
        dialog.appendChild(toast);

        return overlay;
    }

    function createReaderButton(doc, id, title, html) {
        const button = doc.createElement('button');
        button.id = `vn-btn-${id}`;
        button.className = 'vn-icon-btn';
        button.type = 'button';
        button.setAttribute('data-act', id);
        button.setAttribute('title', title);
        button.innerHTML = html;
        return button;
    }

    function buildFallbackSettingsOverlay(doc, snapshot) {
        if (!doc || typeof doc.createElement !== 'function') return null;
        const overlay = doc.createElement('div');
        overlay.id = 'vn-unified-settings';
        overlay.setAttribute('data-vn-vn-ui', 'true');

        const shell = doc.createElement('div');
        shell.className = 'vn-settings-shell';
        shell.setAttribute('role', 'dialog');
        shell.setAttribute('aria-modal', 'true');
        shell.setAttribute('aria-label', '设置');
        overlay.appendChild(shell);

        const head = doc.createElement('div');
        head.className = 'vn-settings-head';
        shell.appendChild(head);

        const title = doc.createElement('div');
        title.className = 'vn-settings-title';
        title.textContent = '设置';
        head.appendChild(title);

        const badge = doc.createElement('div');
        badge.className = 'vn-settings-badge';
        badge.textContent = options.version || '0.5.4';
        head.appendChild(badge);

        const close = doc.createElement('button');
        close.className = 'vn-settings-close';
        close.type = 'button';
        close.setAttribute('data-action', 'close');
        close.setAttribute('aria-label', '关闭');
        close.textContent = '×';
        head.appendChild(close);

        const tabs = doc.createElement('div');
        tabs.className = 'vn-settings-tabs';
        shell.appendChild(tabs);
        for (const tab of snapshot.tabs || []) {
            const button = doc.createElement('button');
            button.className = `vn-settings-tab${tab.active ? ' is-active' : ''}`;
            button.type = 'button';
            button.setAttribute('data-tab', tab.id);
            button.textContent = tab.label;
            tabs.appendChild(button);
        }

        const body = doc.createElement('div');
        body.className = 'vn-settings-body';
        body.innerHTML = renderSettingsBody(snapshot.tab, snapshot.draft, {
            imageResult: snapshot.resultText && snapshot.resultText.image,
            imageModelsMessage: snapshot.resultText && snapshot.resultText.imageModels,
            virtualRegexPreview: snapshot.resultText && snapshot.resultText.virtualRegex,
        });
        shell.appendChild(body);
        return overlay;
    }

    function updateMountedSettings(snapshot) {
        const current = state.activeSettings;
        if (!current || !current.dom || !current.dom.root) return;
        const container = current.dom.root;
        const prevBody = container.querySelector('.vn-settings-body');
        const scrollTop = prevBody ? prevBody.scrollTop : 0;
        clearChildren(container);
        container.innerHTML = snapshot.html;
        current.dom.overlay = container.querySelector('#vn-unified-settings');
        if (!current.dom.overlay) {
            current.dom.overlay = buildFallbackSettingsOverlay(container.ownerDocument || getRootDocument(options.global), snapshot);
            if (current.dom.overlay) container.appendChild(current.dom.overlay);
        }
        if (current.dom.overlay) {
            attachSettingsViewportEvents(current.dom, current.dom.overlay);
        }
        const nextBody = container.querySelector('.vn-settings-body');
        if (nextBody && scrollTop) nextBody.scrollTop = scrollTop;
    }

    function applyReaderSnapshotToDom(root, snapshot, current) {
        root.className = snapshot.classes.join(' ');
        root.setAttribute('data-vn-vn-ui', 'true');

        const bg = root.querySelector('#vn-bg');
        const bgBlur = root.querySelector('#vn-bg-blur');
        const textEl = root.querySelector('#vn-text');
        const progress = root.querySelector('#vn-progress');
        const input = root.querySelector('#vn-input');
        const send = root.querySelector('#vn-send-btn');
        const dialog = root.querySelector('#vn-dialog');
        const toolbar = root.querySelector('#vn-ctrl-bar');
        const clickLayer = root.querySelector('#vn-click-layer');
        const toast = root.querySelector('#vn-toast');

        if (bg && snapshot.content.backgroundImage) {
            bg.style.backgroundImage = `url("${snapshot.content.backgroundImage.replace(/"/g, '&quot;')}")`;
            removeImageLoadingSpinner(bg);
        } else if (bg) {
            bg.style.backgroundImage = '';
            if (snapshot.content.imageExpectedCount > 0 && snapshot.content.imageBoundCount < snapshot.content.imageExpectedCount) {
                ensureImageLoadingSpinner(bg);
            } else {
                removeImageLoadingSpinner(bg);
            }
        }
        if (bgBlur && snapshot.content.backgroundImage) {
            bgBlur.style.backgroundImage = `url("${snapshot.content.backgroundImage.replace(/"/g, '&quot;')}")`;
            bgBlur.style.opacity = '0.72';
        } else if (bgBlur) {
            bgBlur.style.backgroundImage = '';
            bgBlur.style.opacity = '0';
        }
        const spriteEl = root.querySelector('#vn-sprite');
        if (spriteEl && snapshot.content.spriteImage) {
            spriteEl.style.backgroundImage = `url("${snapshot.content.spriteImage.replace(/"/g, '&quot;')}")`;
            spriteEl.style.display = 'block';
            spriteEl.style.cssText += ';position:absolute;inset:0;width:100%;height:100%;transform:none;bottom:auto;left:auto';
            if (!current.spriteEditMode) {
                const layout = (snapshot.readerSettings.spriteLayouts || {})[snapshot.mode] || { posX: 50, posY: 100, scale: 100 };
                spriteEl.style.backgroundSize = `${layout.scale}%`;
                spriteEl.style.backgroundPosition = `${layout.posX}% ${layout.posY}%`;
            }
        } else if (spriteEl) {
            spriteEl.style.backgroundImage = '';
            spriteEl.style.display = 'none';
        }
        if (textEl) {
            textEl.textContent = snapshot.content.displayText;
            textEl.style.fontSize = `${snapshot.readerSettings.fontSize}px`;
            textEl.style.lineHeight = computeLineHeight(snapshot.readerSettings.fontSize);
        }
        if (progress) {
            progress.textContent = snapshot.content.progress;
        }
        if (input) {
            input.placeholder = snapshot.input.placeholder;
            input.value = current.inputValue;
        }
        if (send) {
            send.addEventListener('click', async () => {
                await current.controller.submit(input ? input.value : current.inputValue);
            });
        }
        if (clickLayer) {
            clickLayer.addEventListener('click', () => {
                if (current.dragSuppressClick || (current.runtime && current.runtime.dragSuppressClick)) {
                    current.dragSuppressClick = false;
                    if (current.runtime) current.runtime.dragSuppressClick = false;
                    return;
                }
                if (current.hidden) {
                    current.controller.toggleHidden();
                    return;
                }
                if (state.activeSettings) {
                    closeSettings();
                    return;
                }
                handleReaderAction('next');
            });
        }
        if (dialog) {
            dialog.addEventListener('click', (event) => {
                if (current.hidden) return;
                if (event.target && event.target.closest && (
                    event.target.closest('.vn-controls')
                    || event.target.closest('#vn-ctrl-bar')
                    || event.target.closest('#vn-settings')
                )) {
                    return;
                }
                const rect = typeof dialog.getBoundingClientRect === 'function'
                    ? dialog.getBoundingClientRect()
                    : { left: 0, width: 0 };
                const clientX = Number(event.clientX);
                if (!Number.isFinite(clientX) || clientX < rect.left + rect.width / 2) {
                    handleReaderAction('prev');
                } else {
                    handleReaderAction('next');
                }
            });
        }
        if (dialog) {
            dialog.classList.toggle('vn-hidden', current.hidden);
            if (snapshot.readerSettings.glassOpacity != null) {
                dialog.style.background = `rgba(20,20,22,${snapshot.readerSettings.glassOpacity})`;
            }
        }
        applyToolbarState(root, current);
        applyReaderSettingsToDom(root, snapshot, current, { dialog, textEl, toolbar });
        applyReaderModeRuntime(root, snapshot, current);
        if (toast) {
            toast.textContent = current.toastMessage || '';
            toast.style.opacity = current.toastMessage ? '1' : '0';
        }
    }

    function applyToolbarState(root, current) {
        if (!root || !current) return;
        const collapsible = root.querySelector('#vn-bar-btns');
        const pinned = root.querySelector('#vn-bar-pinned');
        const readerSettings = current.snapshot && current.snapshot.readerSettings || {};
        const pins = new Set(Array.isArray(readerSettings.pinnedBtns) ? readerSettings.pinnedBtns : []);
        const hiddenSet = new Set(Array.isArray(readerSettings.hiddenBtns) ? readerSettings.hiddenBtns : []);
        const order = Array.isArray(readerSettings.btnOrder) && readerSettings.btnOrder.length
            ? readerSettings.btnOrder
            : TOOLBAR_ACTIONS.map(([id]) => id);

        for (const id of order) {
            const button = root.querySelector(`#vn-btn-${id}`);
            if (!button) continue;
            if (hiddenSet.has(id)) {
                button.style.display = 'none';
            } else {
                button.style.display = '';
                if (pins.has(id) && pinned) {
                    pinned.appendChild(button);
                } else if (collapsible) {
                    collapsible.appendChild(button);
                }
            }
        }

        if (collapsible) {
            collapsible.style.display = current.toolbarCollapsed ? 'none' : 'flex';
            collapsible.style.gap = '6px';
            collapsible.style.alignItems = 'center';
        }
        if (pinned) {
            pinned.style.display = 'flex';
            pinned.style.gap = '6px';
            pinned.style.alignItems = 'center';
        }
    }

    function applyReaderSettingsToDom(root, snapshot, current, refs = {}) {
        const dialog = refs.dialog || root.querySelector('#vn-dialog');
        const textEl = refs.textEl || root.querySelector('#vn-text');
        const toolbar = refs.toolbar || root.querySelector('#vn-ctrl-bar');
        const controls = root.querySelector('.vn-controls');
        const bg = root.querySelector('#vn-bg');
        const bgBlur = root.querySelector('#vn-bg-blur');
        const readerSettings = snapshot.readerSettings || {};
        const inlineMode = snapshot.mode === 'pc' || snapshot.mode === 'mobile';
        const win = getOwnerWindow(root);
        const overlayWidth = readElementWidth(root, win && win.innerWidth);
        const overlayHeight = readElementHeight(root, win && win.innerHeight);

        if (textEl) {
            textEl.style.fontSize = `${readerSettings.fontSize}px`;
            textEl.style.lineHeight = computeLineHeight(readerSettings.fontSize);
            if (readerSettings.dialogHeight == null) {
                textEl.style.minHeight = '0';
            } else if (inlineMode) {
                const maxHeight = Math.max(40, Math.floor((overlayHeight || 0) * 0.24));
                textEl.style.minHeight = `${Math.min(readerSettings.dialogHeight, maxHeight || readerSettings.dialogHeight)}px`;
            } else {
                textEl.style.minHeight = `${readerSettings.dialogHeight}px`;
            }
        }

        if (dialog) {
            if (readerSettings.dialogWidth == null) {
                dialog.style.width = '';
            } else if (inlineMode) {
                const clampedWidth = Math.max(180, Math.min(readerSettings.dialogWidth, Math.max(180, (overlayWidth || readerSettings.dialogWidth) - 24)));
                dialog.style.width = `${clampedWidth}px`;
            } else {
                const viewportWidth = Number(win && win.innerWidth) || readerSettings.dialogWidth;
                dialog.style.width = `${Math.max(260, Math.min(readerSettings.dialogWidth, Math.max(260, viewportWidth - 8)))}px`;
            }
            dialog.style.background = `rgba(20,20,22,${normalizeOpacity(readerSettings.glassOpacity, .62)})`;
        }

        if (toolbar) {
            toolbar.style.transform = `scale(${Number(readerSettings.toolbarScale || 100) / 100})`;
            toolbar.style.transformOrigin = 'right bottom';
            toolbar.style.background = `rgba(20,20,22,${Math.max(0, normalizeOpacity(readerSettings.glassOpacity, .62) - 0.07)})`;
        }

        if (controls) {
            controls.style.zoom = String(Number(readerSettings.inputScale || 100) / 100);
        }

        if (bg) {
            bg.style.backgroundSize = readerSettings.imgMode === 'contain' ? 'contain' : 'cover';
            bg.style.backgroundColor = '#000';
        }
        if (bgBlur) {
            bgBlur.style.backgroundSize = readerSettings.imgMode === 'contain' ? 'cover' : 'cover';
        }
    }

    function applyReaderModeRuntime(root, snapshot, current) {
        if (current.runtime && current.runtime.mode === snapshot.mode && current.runtime.root === root) {
            return;
        }
        clearReaderModeRuntime(current);
        const win = getOwnerWindow(root);
        const doc = root && root.ownerDocument;
        const runtime = {
            cleanup: [],
            mode: snapshot.mode,
            win,
            doc,
            root,
        };
        current.runtime = runtime;

        if (snapshot.mode === 'pc' || snapshot.mode === 'mobile') {
            applyInlineReaderRuntime(root, snapshot.mode, runtime, current);
            return;
        }
        if (snapshot.mode === 'web') {
            applyWebReaderRuntime(root, runtime);
            return;
        }
        if (snapshot.mode === 'fullscreen') {
            applyFullscreenReaderRuntime(root, current, runtime);
        }
    }

    function clearReaderModeRuntime(current) {
        const runtime = current && current.runtime;
        if (!runtime || !Array.isArray(runtime.cleanup)) return;
        while (runtime.cleanup.length) {
            const fn = runtime.cleanup.pop();
            try {
                fn();
            } catch (error) {
                // Best-effort cleanup.
            }
        }
        current.runtime = null;
    }

    function addRuntimeCleanup(runtime, fn) {
        if (runtime && typeof fn === 'function') runtime.cleanup.push(fn);
    }

    function applyInlineReaderRuntime(root, mode, runtime, current) {
        const win = runtime.win || {};
        const doc = runtime.doc || {};
        const floatingState = current && current.floatingState
            ? current.floatingState
            : { dragged: false, left: null, top: null };
        let suppressTimer = null;
        root.style.top = 'auto';
        root.style.right = 'auto';
        root.style.left = '50%';
        root.style.bottom = '24px';
        root.style.transform = 'translateX(-50%)';
        root.style.boxSizing = 'border-box';
        root.style.zIndex = '2147483000';
        root.style.width = mode === 'pc' ? 'min(900px,calc(100vw - 32px))' : 'min(480px,calc(100vw - 32px))';
        root.style.height = mode === 'pc' ? 'min(540px,calc(100dvh - 32px))' : 'min(680px,calc(100dvh - 32px))';
        root.style.borderRadius = mode === 'pc' ? '18px' : '22px';
        root.style.boxShadow = '0 20px 64px rgba(0,0,0,0.42)';
        root.style.overflow = 'hidden';

        let scheduled = false;
        const clamp = () => {
            scheduled = false;
            const viewport = getInlineViewportMetrics(win, doc);
            const designWidth = mode === 'pc' ? 900 : 480;
            const designHeight = mode === 'pc' ? 540 : 680;
            const sideGap = 16;
            const bottomGap = 24;
            const minSize = 240;
            const minExtremeSize = 180;
            const safeWidth = Math.max(minSize, (viewport.width || (designWidth + sideGap * 2)) - sideGap * 2);
            const safeHeight = Math.max(minSize, (viewport.height || (designHeight + sideGap * 2)) - sideGap * 2);
            let targetWidth = Math.min(designWidth, safeWidth);
            let targetHeight = Math.min(designHeight, safeHeight);
            const availableHeight = (viewport.height || (targetHeight + sideGap + bottomGap)) - sideGap - bottomGap;
            if (availableHeight < targetHeight) {
                targetHeight = Math.max(minExtremeSize, Math.min(targetHeight, availableHeight));
            }
            const minLeft = viewport.left + 8;
            const minTop = viewport.top + 8;
            const maxLeft = Math.max(minLeft, viewport.right - targetWidth - 8);
            const maxTop = Math.max(minTop, viewport.bottom - targetHeight - 8);
            const defaultLeft = Math.round(viewport.left + (viewport.width || targetWidth) / 2);
            let targetLeft = defaultLeft;
            let targetTop = viewport.top + (viewport.height || (targetHeight + bottomGap)) - bottomGap - targetHeight;
            if (targetTop < minTop) targetTop = minTop;
            if (maxTop >= minTop && targetTop > maxTop) targetTop = maxTop;
            root.style.maxWidth = `${safeWidth}px`;
            root.style.maxHeight = `${safeHeight}px`;
            root.style.width = `${targetWidth}px`;
            root.style.height = `${targetHeight}px`;
            if (floatingState.dragged && Number.isFinite(floatingState.left) && Number.isFinite(floatingState.top)) {
                targetLeft = clampNumber(floatingState.left, minLeft, maxLeft);
                targetTop = clampNumber(floatingState.top, minTop, maxTop);
                floatingState.left = targetLeft;
                floatingState.top = targetTop;
                root.style.left = `${Math.round(targetLeft)}px`;
                root.style.top = `${Math.round(targetTop)}px`;
                root.style.right = 'auto';
                root.style.bottom = 'auto';
                root.style.transform = 'none';
                return;
            }
            root.style.left = `${defaultLeft}px`;
            root.style.top = `${Math.round(targetTop)}px`;
            root.style.right = 'auto';
            root.style.bottom = 'auto';
            root.style.transform = 'translateX(-50%)';
        };
        const schedule = () => {
            if (scheduled) return;
            scheduled = true;
            const raf = typeof win.requestAnimationFrame === 'function'
                ? win.requestAnimationFrame.bind(win)
                : null;
            if (raf) {
                raf(clamp);
            } else {
                const setter = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
                setter(clamp, 16);
            }
        };

        clamp();
        schedule();
        installFloatingDragRuntime(root, runtime, current, floatingState, () => {
            if (suppressTimer != null) {
                const clearer = typeof win.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout;
                clearer(suppressTimer);
            }
            current.dragSuppressClick = true;
            runtime.dragSuppressClick = true;
            const setter = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
            suppressTimer = setter(() => {
                current.dragSuppressClick = false;
                runtime.dragSuppressClick = false;
                suppressTimer = null;
            }, 120);
        });
        addEventListenerWithCleanup(win, 'resize', schedule, runtime);
        addEventListenerWithCleanup(win, 'orientationchange', schedule, runtime);
        if (win.visualViewport) {
            addEventListenerWithCleanup(win.visualViewport, 'resize', schedule, runtime);
            addEventListenerWithCleanup(win.visualViewport, 'scroll', schedule, runtime);
        }
        addRuntimeCleanup(runtime, () => {
            if (suppressTimer != null) {
                const clearer = typeof win.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout;
                clearer(suppressTimer);
            }
        });
    }

    function installFloatingDragRuntime(root, runtime, current, floatingState, onSuppressClick) {
        if (!root || !runtime || !current) return;
        const layer = root.querySelector('#vn-click-layer');
        const doc = runtime.doc;
        if (!layer || !doc || typeof doc.addEventListener !== 'function') return;
        let active = false;
        let dragging = false;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let pointerId = null;

        const onMove = (event) => {
            if (!active) return;
            const clientX = Number(event && event.clientX);
            const clientY = Number(event && event.clientY);
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            if (!dragging && Math.hypot(dx, dy) < 6) return;
            dragging = true;
            root.classList.add('is-dragging');
            if (event && event.cancelable && typeof event.preventDefault === 'function') event.preventDefault();
            const viewport = getInlineViewportMetrics(runtime.win || {}, doc);
            const minLeft = viewport.left + 8;
            const minTop = viewport.top + 8;
            const maxLeft = Math.max(minLeft, viewport.right - root.offsetWidth - 8);
            const maxTop = Math.max(minTop, viewport.bottom - root.offsetHeight - 8);
            const nextLeft = clampNumber(startLeft + dx, minLeft, maxLeft);
            const nextTop = clampNumber(startTop + dy, minTop, maxTop);
            floatingState.dragged = true;
            floatingState.left = nextLeft;
            floatingState.top = nextTop;
            runtime.dragged = true;
            root.style.left = `${Math.round(nextLeft)}px`;
            root.style.top = `${Math.round(nextTop)}px`;
            root.style.right = 'auto';
            root.style.bottom = 'auto';
            root.style.transform = 'none';
        };

        const onUp = () => {
            if (!active) return;
            active = false;
            try {
                if (pointerId !== null && typeof layer.releasePointerCapture === 'function') {
                    layer.releasePointerCapture(pointerId);
                }
            } catch (error) {
                // Ignore missing pointer capture implementations.
            }
            if (typeof doc.removeEventListener === 'function') {
                doc.removeEventListener('pointermove', onMove);
                doc.removeEventListener('pointerup', onUp);
                doc.removeEventListener('pointercancel', onUp);
            }
            root.classList.remove('is-dragging');
            if (dragging && typeof onSuppressClick === 'function') onSuppressClick();
            dragging = false;
            pointerId = null;
        };

        layer.addEventListener('pointerdown', (event) => {
            if (event && event.button !== undefined && event.button !== 0) return;
            const clientX = Number(event && event.clientX);
            const clientY = Number(event && event.clientY);
            if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
            active = true;
            dragging = false;
            startX = clientX;
            startY = clientY;
            pointerId = event && event.pointerId !== undefined ? event.pointerId : null;
            const rect = typeof root.getBoundingClientRect === 'function'
                ? root.getBoundingClientRect()
                : { left: 0, top: 0 };
            startLeft = Number.isFinite(rect.left) ? rect.left : 0;
            startTop = Number.isFinite(rect.top) ? rect.top : 0;
            try {
                if (pointerId !== null && typeof layer.setPointerCapture === 'function') {
                    layer.setPointerCapture(pointerId);
                }
            } catch (error) {
                // Ignore missing pointer capture implementations.
            }
            doc.addEventListener('pointermove', onMove);
            doc.addEventListener('pointerup', onUp);
            doc.addEventListener('pointercancel', onUp);
        });

        addRuntimeCleanup(runtime, () => {
            if (typeof doc.removeEventListener === 'function') {
                doc.removeEventListener('pointermove', onMove);
                doc.removeEventListener('pointerup', onUp);
                doc.removeEventListener('pointercancel', onUp);
            }
            root.classList.remove('is-dragging');
        });
    }

    function applyWebReaderRuntime(root, runtime) {
        const win = runtime.win || {};
        const doc = runtime.doc;
        if (!doc || !doc.body || !doc.documentElement) return;
        const savedScrollY = Number(win.scrollY) || 0;
        const savedBody = {
            overflow: doc.body.style.overflow || '',
            position: doc.body.style.position || '',
            width: doc.body.style.width || '',
            top: doc.body.style.top || '',
        };
        const savedHtmlOverflow = doc.documentElement.style.overflow || '';

        doc.body.style.overflow = 'hidden';
        doc.body.style.position = 'fixed';
        doc.body.style.width = '100%';
        doc.body.style.top = `-${savedScrollY}px`;
        doc.documentElement.style.overflow = 'hidden';

        const syncHeight = () => {
            const height = runtime.win && runtime.win.visualViewport && Number.isFinite(runtime.win.visualViewport.height)
                ? runtime.win.visualViewport.height
                : Number(runtime.win && runtime.win.innerHeight) || 0;
            if (height > 0) root.style.height = `${Math.round(height)}px`;
        };
        syncHeight();
        if (win.visualViewport) addEventListenerWithCleanup(win.visualViewport, 'resize', syncHeight, runtime);

        addRuntimeCleanup(runtime, () => {
            doc.body.style.overflow = savedBody.overflow;
            doc.body.style.position = savedBody.position;
            doc.body.style.width = savedBody.width;
            doc.body.style.top = savedBody.top;
            doc.documentElement.style.overflow = savedHtmlOverflow;
            if (typeof win.scrollTo === 'function') win.scrollTo(0, savedScrollY);
        });
    }

    function applyFullscreenReaderRuntime(root, current, runtime) {
        const doc = runtime.doc;
        if (!doc) return;
        const target = doc.documentElement || doc.body;
        const request = target && (target.requestFullscreen || target.webkitRequestFullscreen);
        if (typeof request === 'function') {
            try {
                const result = request.call(target);
                if (result && typeof result.catch === 'function') result.catch(() => {});
            } catch (error) {
                // Ignore fullscreen failures in simulation.
            }
        }
        const onFullscreenChange = () => {
            if (!state.activeReader || state.activeReader !== current) return;
            if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
                closeReader();
            }
        };
        addEventListenerWithCleanup(doc, 'fullscreenchange', onFullscreenChange, runtime);
        addEventListenerWithCleanup(doc, 'webkitfullscreenchange', onFullscreenChange, runtime);
        addRuntimeCleanup(runtime, () => {
            const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
            if ((doc.fullscreenElement || doc.webkitFullscreenElement) && typeof exit === 'function') {
                try {
                    const result = exit.call(doc);
                    if (result && typeof result.catch === 'function') result.catch(() => {});
                } catch (error) {
                    // Ignore exit failures.
                }
            }
        });
    }

    function getInlineViewportMetrics(win, doc) {
        const viewport = win && win.visualViewport;
        const docEl = doc && doc.documentElement ? doc.documentElement : {};
        const fallbackWidth = Math.round(Number(win && win.innerWidth) || Number(docEl.clientWidth) || 0);
        const fallbackHeight = Math.round(Number(win && win.innerHeight) || Number(docEl.clientHeight) || 0);
        let left = Math.round(viewport && Number.isFinite(viewport.offsetLeft) ? viewport.offsetLeft : 0);
        let top = Math.round(viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0);
        let width = Math.round(viewport && Number.isFinite(viewport.width) ? viewport.width : 0);
        let height = Math.round(viewport && Number.isFinite(viewport.height) ? viewport.height : 0);
        if (width < 240 && fallbackWidth >= 240) {
            width = fallbackWidth;
            left = 0;
        }
        if (height < 240 && fallbackHeight >= 240) {
            height = fallbackHeight;
            top = 0;
        }
        width = width || fallbackWidth || 320;
        height = height || fallbackHeight || 480;
        return {
            left,
            top,
            width,
            height,
            right: left + width,
            bottom: top + height,
        };
    }

    function addEventListenerWithCleanup(target, type, handler, runtime) {
        if (!target || typeof target.addEventListener !== 'function') return;
        target.addEventListener(type, handler);
        addRuntimeCleanup(runtime, () => {
            if (typeof target.removeEventListener === 'function') {
                target.removeEventListener(type, handler);
            }
        });
    }

    function resolveBridgeConfigSnapshot(optionsForSnapshot = {}) {
        const getter = typeof options.getUnifiedSettings === 'function'
            ? options.getUnifiedSettings
            : () => ({ bridge: {}, readerSettings: {}, readerMode: 'pc', version: options.version || '0.5.4' });
        const snapshot = getter(optionsForSnapshot) || {};
        return normalizeUnifiedSettings(snapshot, optionsForSnapshot.mode);
    }

    function normalizeUnifiedSettings(snapshot, preferredMode) {
        const bridge = normalizeBridgeConfig(snapshot.bridge);
        const readerMode = normalizeReaderMode(firstDefined(snapshot.readerMode, preferredMode, bridge.openMode), bridge);
        const readerSettings = normalizeReaderSettings(readerMode, snapshot.readerSettings);

        return {
            version: snapshot.version || options.version || '0.5.4',
            bridge,
            imageApi: bridge.imageApi,
            readerMode,
            readerSettings,
        };
    }

    function normalizeBridgeConfig(bridge) {
        const normalized = cloneData(bridge || {});
        normalized.openMode = normalizeReaderMode(normalized.openMode, normalized);
        normalized.showToasts = normalizeBoolean(normalized.showToasts, true);
        normalized.debug = normalizeBoolean(normalized.debug, false);
        normalized.sourceFilter = normalizeSourceFilter(normalized.sourceFilter);
        normalized.virtualRegex = normalizeVirtualRegex(normalized.virtualRegex);
        normalized.imageApi = normalizeImageApi(normalized.imageApi);
        normalized.sceneAssets = normalizeSceneAssets(normalized.sceneAssets);
        return normalized;
    }

    function normalizeImageApi(value) {
        const normalized = {
            ...cloneData(DEFAULT_IMAGE_API),
            ...cloneData(value || {}),
        };
        normalized.availableModels = Array.isArray(normalized.availableModels)
            ? normalized.availableModels.filter(Boolean)
            : [];
        return normalized;
    }

    function normalizeSceneAssets(value) {
        const normalized = cloneData(value || {});
        normalized.enabled = normalizeBoolean(normalized.enabled, false);
        normalized.promptRule = String(normalized.promptRule || DEFAULT_SCENE_PROMPT_RULE);
        if (!normalized.scenes || typeof normalized.scenes !== 'object' || Array.isArray(normalized.scenes)) {
            normalized.scenes = {};
        }
        if (!normalized.characters || typeof normalized.characters !== 'object' || Array.isArray(normalized.characters)) {
            normalized.characters = {};
        }
        return normalized;
    }

    function normalizeReaderSettings(mode, settings) {
        const inlineMode = mode === 'pc' || mode === 'mobile';
        const currentVersion = READER_SETTINGS_SCHEMA_VERSION;
        const src = (settings && settings._v === currentVersion) ? cloneData(settings) : {};
        const base = {
            _v: currentVersion,
            fontSize: inlineMode ? 15 : 18,
            dialogWidth: null,
            dialogHeight: null,
            glassOpacity: 0.62,
            toolbarScale: inlineMode ? 60 : 100,
            inputScale: inlineMode ? 60 : 100,
            imgMode: 'adaptive',
            stayMode: false,
            imageCountOverride: null,
            pinnedBtns: Array.from(DEFAULT_PINNED_TOOLBAR_BUTTONS),
            hiddenBtns: [],
            btnOrder: TOOLBAR_ACTIONS.map(([id]) => id),
            spriteLayouts: {},
        };
        const normalized = { ...base, ...src };
        normalized.fontSize = normalizeFiniteNumber(normalized.fontSize, base.fontSize);
        normalized.dialogWidth = normalizeNullableNumber(normalized.dialogWidth);
        normalized.dialogHeight = normalizeNullableNumber(normalized.dialogHeight);
        normalized.glassOpacity = normalizeOpacity(normalized.glassOpacity, base.glassOpacity);
        normalized.toolbarScale = normalizeFiniteNumber(normalized.toolbarScale, base.toolbarScale);
        normalized.inputScale = normalizeFiniteNumber(normalized.inputScale, base.inputScale);
        normalized.imgMode = normalized.imgMode === 'contain' ? 'contain' : 'adaptive';
        normalized.stayMode = normalizeBoolean(normalized.stayMode, false);
        normalized.imageCountOverride = normalizeNullableNumber(normalized.imageCountOverride);
        normalized.pinnedBtns = normalizePinnedButtons(normalized.pinnedBtns);
        normalized.hiddenBtns = normalizeHiddenButtons(normalized.hiddenBtns);
        normalized.btnOrder = normalizeBtnOrder(normalized.btnOrder);
        normalized.spriteLayouts = normalizeSpriteLayouts(normalized.spriteLayouts);
        return normalized;
    }

    function buildRegexPreview(bridge) {
        const filter = normalizeSourceFilter(bridge.sourceFilter);
        const virtualRegex = normalizeVirtualRegex(bridge.virtualRegex);
        const previewMessage = resolvePreviewMessage();
        const payload = buildVisualNovelTextPayload(previewMessage, {
            sourceFilter: filter,
            virtualRegex,
        });
        if (!payload.formattedText) {
            return '当前没有可测试的正文内容。';
        }
        if (!virtualRegex.enabled || !virtualRegex.pattern) {
            return `formattedTextLength=${payload.formattedText.length}\n\n最终正文：\n${payload.formattedText}`;
        }
        return [
            `source=${payload.sourceKind}`,
            `tagTextLength=${String(payload.tagText || '').trim().length}`,
            `formattedTextLength=${payload.formattedText.length}`,
            `changed=${payload.virtualRegexChanged === true}`,
            payload.usedFallback ? 'fallback=true' : 'fallback=false',
            '',
            '最终正文：',
            payload.formattedText,
        ].join('\n');
    }

    function resolvePreviewMessage() {
        if (state.activeReader && state.activeReader.payload && state.activeReader.payload.message) {
            return state.activeReader.payload.message;
        }
        if (typeof options.getCurrentMessage === 'function') {
            const message = options.getCurrentMessage();
            if (message && typeof message === 'object' && typeof message.then !== 'function') {
                return message;
            }
        }
        return '';
    }

    function writeToast(message) {
        const current = state.activeReader;
        if (!current) return;
        const bridge = resolveBridgeConfigSnapshot({ mode: current.mode }).bridge;
        applyToastToReader(current, bridge.showToasts !== false, message);
    }

    function enterSpriteEditMode(overlay, current) {
        if (current.spriteEditMode) return;
        const spriteEl = overlay.querySelector('#vn-sprite');
        if (!spriteEl || spriteEl.style.display === 'none') { writeToast('当前无立绘可编辑'); return; }
        closeSettings();
        const mode = current.snapshot.mode;
        const rs = current.snapshot.readerSettings;
        const modeLayout = (rs.spriteLayouts || {})[mode] || { posX: 50, posY: 100, scale: 100 };
        const orig = { ...modeLayout };
        let posX = orig.posX, posY = orig.posY, scale = orig.scale;
        const clickLayer = overlay.querySelector('#vn-click-layer');
        if (clickLayer) clickLayer.style.pointerEvents = 'none';

        const origSpriteStyle = {
            position: spriteEl.style.position,
            inset: spriteEl.style.inset,
            width: spriteEl.style.width,
            height: spriteEl.style.height,
            transform: spriteEl.style.transform,
            bottom: spriteEl.style.bottom,
            left: spriteEl.style.left,
        };
        spriteEl.style.cssText += ';position:absolute;inset:0;width:100%;height:100%;transform:none;bottom:auto;left:auto';
        spriteEl.classList.add('vn-sprite-editing');

        const doc = overlay.ownerDocument;
        const editBar = doc.createElement('div');
        editBar.id = 'vn-sprite-edit-bar';
        editBar.innerHTML = '<span class="vn-se-hint">拖动调整，滚轮/双指缩放</span>'
            + '<button data-se="reset" type="button">还原</button>'
            + '<button data-se="cancel" type="button">取消</button>'
            + '<button data-se="save" class="vn-se-save" type="button">保存</button>';
        overlay.appendChild(editBar);
        current.spriteEditMode = { orig, editBar, clickLayer, mode, origSpriteStyle };

        function apply() {
            spriteEl.style.backgroundSize = `${scale}%`;
            spriteEl.style.backgroundPosition = `${posX}% ${posY}%`;
        }
        apply();

        editBar.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-se]');
            if (!btn) return;
            const act = btn.getAttribute('data-se');
            if (act === 'reset') { posX = 50; posY = 100; scale = 100; apply(); }
            else if (act === 'cancel') { exitSpriteEditMode(overlay, current, null); }
            else if (act === 'save') { exitSpriteEditMode(overlay, current, { posX, posY, scale }); }
        });

        const pointers = new Map();
        let dragStart = null, pinchStart = null;
        spriteEl.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            try { spriteEl.setPointerCapture(event.pointerId); } catch (e) {}
            if (pointers.size === 1) {
                dragStart = { x: event.clientX, y: event.clientY, posX, posY };
                spriteEl.classList.add('is-dragging');
            } else if (pointers.size === 2) {
                dragStart = null;
                const pts = [...pointers.values()];
                pinchStart = { dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), scale };
            }
        });
        spriteEl.addEventListener('pointermove', (event) => {
            if (!pointers.has(event.pointerId)) return;
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pointers.size === 1 && dragStart) {
                const rect = spriteEl.getBoundingClientRect ? spriteEl.getBoundingClientRect() : { width: 400, height: 600 };
                posX = dragStart.posX - (event.clientX - dragStart.x) / rect.width * 100;
                posY = dragStart.posY - (event.clientY - dragStart.y) / rect.height * 100;
                apply();
            } else if (pointers.size === 2 && pinchStart) {
                const pts = [...pointers.values()];
                const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
                scale = Math.max(50, Math.min(300, pinchStart.scale * (dist / pinchStart.dist)));
                apply();
            }
        });
        function endPointer(event) {
            pointers.delete(event.pointerId);
            if (pointers.size === 0) { dragStart = null; spriteEl.classList.remove('is-dragging'); }
            else if (pointers.size === 1) {
                pinchStart = null;
                const [ptr] = pointers.values();
                dragStart = { x: ptr.x, y: ptr.y, posX, posY };
            }
        }
        spriteEl.addEventListener('pointerup', endPointer);
        spriteEl.addEventListener('pointercancel', endPointer);
        spriteEl.addEventListener('wheel', (event) => {
            event.preventDefault();
            scale = Math.max(50, Math.min(300, scale * (event.deltaY < 0 ? 1.1 : 0.91)));
            apply();
        }, { passive: false });
    }

    function exitSpriteEditMode(overlay, current, save) {
        const em = current.spriteEditMode;
        if (!em) return;
        current.spriteEditMode = null;
        const spriteEl = overlay.querySelector('#vn-sprite');
        if (spriteEl) {
            spriteEl.classList.remove('vn-sprite-editing', 'is-dragging');
        }
        if (em.clickLayer) em.clickLayer.style.pointerEvents = '';
        if (em.editBar && em.editBar.parentNode) em.editBar.remove();
        if (save) {
            const unified = resolveBridgeConfigSnapshot({ mode: em.mode });
            const layouts = { ...(unified.readerSettings.spriteLayouts || {}) };
            layouts[em.mode] = { posX: save.posX, posY: save.posY, scale: save.scale };
            saveReaderSettingsPatch({ spriteLayouts: layouts });
        } else {
            if (spriteEl) Object.assign(spriteEl.style, em.origSpriteStyle);
            if (em.orig && spriteEl) {
                spriteEl.style.backgroundSize = `${em.orig.scale}%`;
                spriteEl.style.backgroundPosition = `${em.orig.posX}% ${em.orig.posY}%`;
            }
        }
    }

    function saveReaderSettingsPatch(patch) {
        const save = typeof options.saveUnifiedSettings === 'function' ? options.saveUnifiedSettings : null;
        if (!save || !state.activeReader) return;
        const mode = state.activeReader.mode;
        const unified = resolveBridgeConfigSnapshot({ mode });
        const result = save({ bridge: unified.bridge, readerMode: unified.readerMode, readerSettings: { ...unified.readerSettings, ...patch } });
        if (!result || result.ok === false) return;
        const refreshed = resolveBridgeConfigSnapshot({ mode });
        const readerSettings = normalizeReaderSettings(mode, refreshed.readerSettings);
        readerSettings._sceneAssets = refreshed.bridge.sceneAssets || null;
        state.activeReader.snapshot = buildReaderSnapshot(state.activeReader.payload, mode, readerSettings, state.activeReader.index);
        updateMountedReader(state.activeReader.snapshot);
    }
}

function shouldPollReaderImages(content = {}) {
    const expected = Number(content.imageExpectedCount || content.imageCount || 0) || 0;
    if (!expected) return false;
    const slots = Array.isArray(content.imageSlots) ? content.imageSlots : [];
    if (!slots.length) return false;
    const bound = Number(content.imageBoundCount || 0) || countBoundImageSlots({ slots });
    return bound < expected || !String(content.currentSlotImageUrl || content.currentImageUrl || '').trim();
}

function countBoundImageSlots(imageState = {}) {
    return (Array.isArray(imageState.slots) ? imageState.slots : [])
        .filter((slot) => String(slot && slot.url || '').trim())
        .length;
}

function normalizePollInterval(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return INITIAL_IMAGE_POLL_INTERVAL_MS;
    return Math.max(50, Math.min(750, Math.floor(numeric)));
}

function normalizePollAttempts(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return INITIAL_IMAGE_POLL_ATTEMPTS;
    return Math.max(1, Math.min(20, Math.floor(numeric)));
}

function normalizePinnedButtons(value) {
    const allowed = new Set(TOOLBAR_ACTIONS.map(([id]) => id));
    const output = [];
    for (const id of Array.isArray(value) ? value : []) {
        const normalized = String(id || '').trim();
        if (!normalized || !allowed.has(normalized) || output.includes(normalized)) continue;
        output.push(normalized);
    }
    return output;
}

function normalizeHiddenButtons(value) {
    const allowed = new Set(TOOLBAR_ACTIONS.map(([id]) => id));
    const protected_ = new Set(['settings']);
    const output = [];
    for (const id of Array.isArray(value) ? value : []) {
        const normalized = String(id || '').trim();
        if (!normalized || !allowed.has(normalized) || protected_.has(normalized) || output.includes(normalized)) continue;
        output.push(normalized);
    }
    return output;
}

function normalizeBtnOrder(value) {
    const canonical = TOOLBAR_ACTIONS.map(([id]) => id);
    const allowed = new Set(canonical);
    const output = [];
    for (const id of Array.isArray(value) ? value : []) {
        const normalized = String(id || '').trim();
        if (!normalized || !allowed.has(normalized) || output.includes(normalized)) continue;
        output.push(normalized);
    }
    for (const id of canonical) {
        if (!output.includes(id)) output.push(id);
    }
    return output;
}

function normalizeSpriteLayouts(value) {
    const def = { posX: 50, posY: 100, scale: 100 };
    const out = {};
    for (const m of ['pc', 'mobile', 'web', 'fullscreen']) {
        const src = (value && typeof value[m] === 'object' && value[m]) ? value[m] : {};
        out[m] = {
            posX: normalizeFiniteNumber(src.posX, def.posX),
            posY: normalizeFiniteNumber(src.posY, def.posY),
            scale: normalizeFiniteNumber(src.scale, def.scale),
        };
    }
    return out;
}

function waitForReaderImagePoll(duration, globalObject) {
    return new Promise((resolve) => {
        const timeout = globalObject && typeof globalObject.setTimeout === 'function'
            ? globalObject.setTimeout.bind(globalObject)
            : setTimeout;
        timeout(resolve, duration);
    });
}

function renderTemplate(template, values) {
    return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : '';
    });
}

function field(path, label, inputHtml, note) {
    return `<label class="vn-settings-field"><span>${esc(label)}</span>${inputHtml}${note ? `<em>${esc(note)}</em>` : ''}</label>`;
}

function disabledAttr(disabled) {
    return disabled ? ' disabled aria-disabled="true"' : '';
}

function textInput(path, value, placeholder, type = 'text', disabled = false) {
    return `<input data-path="${esc(path)}" type="${esc(type)}" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}"${disabledAttr(disabled)}>`;
}

function textareaInput(path, value, placeholder = '') {
    return `<textarea data-path="${esc(path)}" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea>`;
}

function secretInput(path, value, placeholder, disabled) {
    return `<div class="vn-settings-secret">${textInput(path, value, placeholder, 'password', disabled)}<button type="button" class="vn-settings-secret-toggle" data-action="toggle-secret" aria-label="显示或隐藏密钥" aria-pressed="false"${disabledAttr(disabled)}>显示</button></div>`;
}

function numberInput(path, value, min, max, disabled) {
    return `<input data-path="${esc(path)}" type="number" min="${esc(min)}" max="${esc(max)}" value="${esc(value)}"${disabledAttr(disabled)}>`;
}

function checkbox(path, value, label) {
    return `<button type="button" class="vn-switch${value ? ' is-on' : ''}" data-switch="${esc(path)}" aria-pressed="${value ? 'true' : 'false'}"><i></i><span>${esc(label)}</span></button>`;
}

function selectInput(path, value, items, disabled = false) {
    const options = items.map(([itemValue, itemLabel]) => {
        const selected = String(itemValue) === String(value) ? ' selected' : '';
        return `<option value="${esc(itemValue)}"${selected}>${esc(itemLabel)}</option>`;
    }).join('');
    return `<select data-path="${esc(path)}"${disabled ? ' disabled' : ''}>${options}</select>`;
}

function segmentedInput(path, value, items, label) {
    const activeIndex = Math.max(0, items.findIndex((item) => String(item[0]) === String(value)));
    return `<div class="vn-segmented" role="radiogroup" aria-label="${esc(label || '')}" data-count="${esc(items.length)}" data-active-index="${esc(activeIndex)}" style="--vn-segment-count:${esc(items.length)};--vn-active-index:${esc(activeIndex)};"><span class="vn-segmented-indicator" aria-hidden="true"></span>${items.map((item) => {
        const selected = String(item[0]) === String(value);
        const icon = item[2] ? `<span class="vn-segmented-btn-icon" aria-hidden="true">${item[2]}</span>` : '';
        return `<button type="button" class="vn-segmented-btn${item[2] ? ' has-icon' : ''}${selected ? ' is-active' : ''}" data-segment-path="${esc(path)}" data-segment-value="${esc(item[0])}" role="radio" aria-checked="${selected ? 'true' : 'false'}" aria-pressed="${selected ? 'true' : 'false'}">${icon}<span class="vn-segmented-btn-label">${esc(item[1])}</span></button>`;
    }).join('')}</div>`;
}

function modelPicker(path, value, models, action, placeholder, disabled) {
    const items = Array.isArray(models) ? models.filter(Boolean) : [];
    const options = ['<option value="">从已拉取模型中选择</option>'].concat(items.map((model) => {
        const selected = model === value ? ' selected' : '';
        return `<option value="${esc(model)}"${selected}>${esc(model)}</option>`;
    })).join('');
    return `<div class="vn-settings-model"><div class="vn-settings-model-row"><input data-path="${esc(path)}" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}"${disabledAttr(disabled)}><button type="button" class="vn-settings-action vn-settings-inline-action" data-action="${esc(action)}"${disabledAttr(disabled)}>拉取模型</button></div><select data-model-sync="${esc(path)}"${items.length && !disabled ? '' : ' disabled'}>${options}</select></div>`;
}

function renderSceneAssetList(scenes) {
    const pencil = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    const entries = Object.entries(scenes || {});
    if (!entries.length) return '<div class="vn-scene-empty">暂无背景图配置</div>';
    return `<div class="vn-btn-mgr-list">${entries.map(([name, url]) => {
        return `<div class="vn-btn-mgr-row"><span class="vn-btn-mgr-label">${esc(name)}</span><button type="button" class="vn-btn-mgr-icon" data-action="scene-rename-bg:${esc(name)}" title="重命名">${pencil}</button><input class="vn-scene-url-input" data-scene-bg="${esc(name)}" value="${esc(url || '')}" placeholder="URL 或 data:image/..."><button type="button" class="vn-btn-mgr-icon" data-action="scene-remove-bg:${esc(name)}" title="删除"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div>`;
    }).join('')}</div>`;
}

function renderCharacterAssetList(characters) {
    const pencil = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    const trash = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    const charEntries = Object.entries(characters || {});
    if (!charEntries.length) return '<div class="vn-scene-empty">暂无角色立绘配置</div>';
    return charEntries.map(([charName, moods]) => {
        const moodEntries = Object.entries(moods || {});
        const moodRows = moodEntries.map(([mood, url]) => {
            return `<div class="vn-btn-mgr-row vn-scene-mood-row"><span class="vn-btn-mgr-label">${esc(mood)}</span><button type="button" class="vn-btn-mgr-icon" data-action="scene-rename-mood:${esc(charName)}:${esc(mood)}" title="重命名">${pencil}</button><input class="vn-scene-url-input" data-scene-char="${esc(charName)}" data-scene-mood="${esc(mood)}" value="${esc(url || '')}" placeholder="URL 或 data:image/..."><button type="button" class="vn-btn-mgr-icon" data-action="scene-remove-mood:${esc(charName)}:${esc(mood)}" title="删除">${trash}</button></div>`;
        }).join('');
        return `<div class="vn-scene-char-group"><div class="vn-btn-mgr-row"><span class="vn-btn-mgr-label" style="font-weight:600">${esc(charName)}</span><button type="button" class="vn-btn-mgr-icon" data-action="scene-rename-char:${esc(charName)}" title="重命名">${pencil}</button><button type="button" class="vn-btn-mgr-icon" data-action="scene-add-mood:${esc(charName)}" title="添加表情">+</button><button type="button" class="vn-btn-mgr-icon" data-action="scene-remove-char:${esc(charName)}" title="删除角色">${trash}</button></div><div class="vn-btn-mgr-list">${moodRows || '<div class="vn-scene-empty">暂无表情</div>'}</div></div>`;
    }).join('');
}

function renderPinnedButtons(pinnedValue, hiddenValue, orderValue) {
    const pins = Array.isArray(pinnedValue) ? pinnedValue : [];
    const hidden = Array.isArray(hiddenValue) ? hiddenValue : [];
    const canonical = TOOLBAR_ACTIONS.map(([id]) => id);
    const order = Array.isArray(orderValue) && orderValue.length ? orderValue : canonical;
    const labelMap = Object.fromEntries(TOOLBAR_ACTIONS);
    const eyeOn = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    const eyeOff = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    const pinIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l1.09 3.27L16 6l-2.18 2.18L14.55 12 12 10.18 9.45 12l.73-3.82L8 6l2.91-.73z"/><line x1="12" y1="12" x2="12" y2="22"/></svg>';
    const rows = order.map((id) => {
        const label = labelMap[id] || id;
        const isHidden = hidden.includes(id);
        const isPinned = pins.includes(id) && !isHidden;
        const canHide = id !== 'settings';
        const eyeBtn = canHide
            ? `<button type="button" class="vn-btn-mgr-icon${isHidden ? '' : ' is-on'}" data-action="toolbar-toggle-visible:${esc(id)}" title="显示/隐藏">${isHidden ? eyeOff : eyeOn}</button>`
            : `<span class="vn-btn-mgr-icon" title="此按钮不可隐藏" style="opacity:.3;cursor:default">${eyeOn}</span>`;
        return `<div class="vn-btn-mgr-row${isHidden ? ' is-hidden-btn' : ''}"><span class="vn-btn-mgr-handle" data-action="toolbar-move-up:${esc(id)}">☰</span><span class="vn-btn-mgr-label">${esc(label)}</span>${eyeBtn}<button type="button" class="vn-btn-mgr-icon${isPinned ? ' is-on' : ''}" data-action="toggle-toolbar-pin:${esc(id)}" title="常驻">${pinIcon}</button></div>`;
    }).join('');
    return `<div class="vn-settings-field"><span>按钮管理</span><div class="vn-btn-mgr-list">${rows}</div><em>☰ 上移排序 · 眼睛切换显隐 · 星切换常驻。隐藏的按钮自动解除常驻。</em></div>`;
}

function getRootDocument(globalObject) {
    const root = globalObject || globalThis.window || globalThis;
    try {
        if (root && root.document) return root.document;
    } catch (error) {
        return null;
    }
    return null;
}

function getOwnerWindow(node) {
    if (node && node.ownerDocument && node.ownerDocument.defaultView) {
        return node.ownerDocument.defaultView;
    }
    const doc = getRootDocument(globalThis.window || globalThis);
    return doc && doc.defaultView ? doc.defaultView : null;
}

function clearChildren(node) {
    if (!node) return;
    if (typeof node.replaceChildren === 'function') {
        node.replaceChildren();
    } else if (Array.isArray(node.children)) {
        for (const child of [...node.children]) {
            if (child && typeof child.remove === 'function') child.remove();
        }
        node.children = [];
    }
    if (Object.prototype.hasOwnProperty.call(node, 'innerHTML') || typeof node.innerHTML === 'string') {
        node.innerHTML = '';
    }
}

function ensureStyleTag(doc, id, text) {
    if (!doc || !doc.head) return;
    if (doc.getElementById(id)) return;
    const style = doc.createElement('style');
    style.id = id;
    style.textContent = text;
    doc.head.appendChild(style);
}

function unmountNode(node) {
    if (node && node.remove) {
        node.remove();
    }
}

function attachSettingsViewportEvents(domState, root) {
    if (!domState || !root) return;
    detachSettingsViewportEvents(domState);
    domState.overlay = root;
    const win = getOwnerWindow(root);
    domState.viewportWindow = win;
    const schedule = () => {
        if (!domState.overlay) return;
        if (domState.viewportRaf !== null && domState.viewportRaf !== undefined) return;
        const raf = win && typeof win.requestAnimationFrame === 'function'
            ? win.requestAnimationFrame.bind(win)
            : null;
        if (!raf) {
            syncSettingsViewportVars(domState.overlay);
            return;
        }
        domState.viewportRaf = -1;
        const nextRaf = raf(() => {
            domState.viewportRaf = null;
            if (domState.overlay) syncSettingsViewportVars(domState.overlay);
        });
        if (domState.viewportRaf === -1) domState.viewportRaf = nextRaf;
    };
    domState.viewportHandler = schedule;
    syncSettingsViewportVars(root);
    if (win && typeof win.addEventListener === 'function') {
        win.addEventListener('resize', schedule, { passive: true });
        win.addEventListener('orientationchange', schedule, { passive: true });
    }
    if (win && win.visualViewport && typeof win.visualViewport.addEventListener === 'function') {
        win.visualViewport.addEventListener('resize', schedule, { passive: true });
        win.visualViewport.addEventListener('scroll', schedule, { passive: true });
    }
}

function detachSettingsViewportEvents(domState) {
    if (!domState) return;
    const win = domState.viewportWindow;
    const handler = domState.viewportHandler;
    if (win && handler && typeof win.removeEventListener === 'function') {
        win.removeEventListener('resize', handler);
        win.removeEventListener('orientationchange', handler);
    }
    if (win && win.visualViewport && handler && typeof win.visualViewport.removeEventListener === 'function') {
        win.visualViewport.removeEventListener('resize', handler);
        win.visualViewport.removeEventListener('scroll', handler);
    }
    if (domState.viewportRaf !== null && domState.viewportRaf !== undefined) {
        const cancel = win && typeof win.cancelAnimationFrame === 'function'
            ? win.cancelAnimationFrame.bind(win)
            : null;
        if (cancel) cancel(domState.viewportRaf);
    }
    domState.viewportHandler = null;
    domState.viewportWindow = null;
    domState.viewportRaf = null;
}

function syncSettingsViewportVars(root) {
    if (!root || !root.style) return;
    const doc = root.ownerDocument;
    const win = doc && doc.defaultView;
    const viewport = win && win.visualViewport;
    const docEl = doc && doc.documentElement ? doc.documentElement : {};
    const left = viewport && Number.isFinite(viewport.offsetLeft) ? viewport.offsetLeft : 0;
    const top = viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0;
    const width = viewport && Number.isFinite(viewport.width) && viewport.width > 0
        ? viewport.width
        : (win && win.innerWidth) || docEl.clientWidth || 320;
    const height = viewport && Number.isFinite(viewport.height) && viewport.height > 0
        ? viewport.height
        : (win && win.innerHeight) || docEl.clientHeight || 480;
    root.style.setProperty('--vn-settings-vleft', `${Math.round(left)}px`);
    root.style.setProperty('--vn-settings-vtop', `${Math.round(top)}px`);
    root.style.setProperty('--vn-settings-vw', `${Math.round(width)}px`);
    root.style.setProperty('--vn-settings-vh', `${Math.round(height)}px`);
}

function normalizeReaderMode(mode, bridge) {
    const resolved = resolveLegacyReaderMode(mode, '', bridge || {});
    return LEGACY_READER_MODES.includes(resolved) ? resolved : 'pc';
}

function normalizeSettingsTab(tab) {
    const normalized = String(tab || 'basic').trim();
    return SETTINGS_TAB_DEFS.some(([id]) => id === normalized) ? normalized : 'basic';
}

function normalizeSettingsValue(path, value) {
    if (path === 'readerMode' || path === 'bridge.openMode' || path === 'bridge.imageApi.mode' || path === 'bridge.imageApi.externalAdapter' || path === 'readerSettings.imgMode') {
        return String(value || '');
    }
    if (path.startsWith('readerSettings.')) {
        if (value === 'null') return null;
        if (/fontSize|dialogWidth|dialogHeight|toolbarScale|inputScale|imageCountOverride/.test(path)) {
            return Number(value);
        }
        if (/glassOpacity/.test(path)) {
            return Number(value);
        }
    }
    if (/^bridge\.imageApi\.(steps|requestTimeoutMs|pollIntervalMs|pollAttempts)$/.test(path)) {
        return Number(value);
    }
    return value;
}

function getPath(target, path) {
    return String(path || '').split('.').reduce((value, key) => (value == null ? value : value[key]), target);
}

function setPath(target, path, value) {
    const parts = String(path || '').split('.');
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
        const key = parts[index];
        if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) {
            cursor[key] = {};
        }
        cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
}

function readElementWidth(element, fallback = 0) {
    return normalizeBoxMeasure(
        element && (element.clientWidth || element.offsetWidth || readNumericPixels(element.style && element.style.width)),
        fallback,
    );
}

function readElementHeight(element, fallback = 0) {
    return normalizeBoxMeasure(
        element && (element.clientHeight || element.offsetHeight || readNumericPixels(element.style && element.style.height)),
        fallback,
    );
}

function normalizeBoxMeasure(value, fallback = 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    return Number(fallback) > 0 ? Number(fallback) : 0;
}

function readNumericPixels(value) {
    if (value == null || value === '') return 0;
    const match = String(value).match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
}

function computeLineHeight(fontSize) {
    if (fontSize <= 8) return '2.0';
    if (fontSize <= 11) return '1.9';
    if (fontSize <= 15) return '1.85';
    if (fontSize <= 18) return '1.7';
    return '1.6';
}

function buildTextSegments(text) {
    return buildNarrativeSegments(text);
}

function applyToastToReader(current, allowed, message) {
    if (!current || !message || allowed === false) return;
    clearReaderToast(current);
    current.toastMessage = String(message);
    const toast = current.dom && current.dom.overlay ? current.dom.overlay.querySelector('#vn-toast') : null;
    if (toast) {
        toast.textContent = current.toastMessage;
        toast.style.opacity = '1';
    }
    const win = current.dom && current.dom.overlay ? getOwnerWindow(current.dom.overlay) : null;
    const setter = win && typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
    current.toastTimer = setter(() => {
        current.toastMessage = '';
        if (toast) toast.style.opacity = '0';
        current.toastTimer = null;
    }, 1800);
}

function clearReaderToast(current) {
    if (!current) return;
    const win = current.dom && current.dom.overlay ? getOwnerWindow(current.dom.overlay) : null;
    const clearer = win && typeof win.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout;
    if (current.toastTimer) {
        clearer(current.toastTimer);
        current.toastTimer = null;
    }
    current.toastMessage = '';
    const toast = current.dom && current.dom.overlay ? current.dom.overlay.querySelector('#vn-toast') : null;
    if (toast) {
        toast.textContent = '';
        toast.style.opacity = '0';
    }
}

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function ensureImageLoadingSpinner(container) {
    if (!container) return;
    if (container.querySelector('.vn-image-loading')) return;
    const wrapper = container.ownerDocument
        ? container.ownerDocument.createElement('div')
        : document.createElement('div');
    wrapper.className = 'vn-image-loading';
    wrapper.setAttribute('aria-label', '图片加载中');
    wrapper.innerHTML = '<span class="vn-spinner vn-image-spinner"></span>';
    container.appendChild(wrapper);
}

function removeImageLoadingSpinner(container) {
    if (!container) return;
    const existing = container.querySelector('.vn-image-loading');
    if (existing) existing.remove();
}

function buildProgressText(currentIndex, totalSegments, imageState) {
    const segmentProgress = `${currentIndex + 1} / ${totalSegments}`;
    if (!imageState || !imageState.count) return segmentProgress;
    const expected = Number(imageState.expectedCount || imageState.count || 0) || 0;
    const bound = Number(imageState.boundCount || 0) || 0;
    const unbound = Number(imageState.unboundCount || 0) || 0;
    const hasSlots = Array.isArray(imageState.slots) && imageState.slots.length > 0;
    if (!hasSlots) return `${segmentProgress}   [${imageState.currentIndex + 1}/${imageState.count} 图]`;
    const currentUrl = String(imageState.slotUrl || imageState.currentUrl || imageState.displayUrl || '').trim();
    const slotText = currentUrl
        ? `图位 ${imageState.currentIndex + 1}/${expected}`
        : '当前图位未生成';
    const suffix = !currentUrl && unbound > 0 ? `，未匹配 ${unbound}` : '';
    return `${segmentProgress}   [${slotText}，已绑定 ${bound}/${expected}${suffix}]`;
}

function normalizeSnapshotImageState(imageState, fallbackIndex = 0) {
    const unboundImages = Array.isArray(imageState && imageState.unboundImages)
        ? imageState.unboundImages
            .map((image, index) => mapSnapshotImageEntry(image, index, true))
            .filter(Boolean)
        : [];
    const slots = Array.isArray(imageState && imageState.slots)
        ? imageState.slots
            .map((image, index) => mapSnapshotImageEntry(image, index, false))
            .filter(Boolean)
        : [];
    const images = slots.length
        ? cloneData(slots)
        : Array.isArray(imageState && imageState.images)
            ? imageState.images
                .map((image, index) => mapSnapshotImageEntry(image, index, true))
                .filter(Boolean)
            : [];
    const totalCount = slots.length || images.length;
    const activeIndex = totalCount
        ? Math.max(0, Math.min(totalCount - 1, normalizeFiniteIndex(
            firstDefined(fallbackIndex, imageState && imageState.currentIndex),
        )))
        : 0;
    const displayImage = slots.length
        ? resolveSnapshotDisplayImage(slots, activeIndex) || resolveIndexedSnapshotUnboundImage(unboundImages, activeIndex, slots.length)
        : images[activeIndex] || null;
    const expectedCount = Number(firstDefined(imageState && imageState.expectedCount, totalCount)) || totalCount;
    const boundCount = slots.length
        ? slots.filter((slot) => String(slot && slot.url || '').trim()).length
        : images.length;
    const unboundCount = unboundImages.length;
    return {
        slots,
        images,
        unboundImages,
        count: totalCount,
        expectedCount,
        boundCount,
        unboundCount,
        availableCount: boundCount + unboundCount,
        signature: String(imageState && imageState.signature || ''),
        currentIndex: activeIndex,
        currentUrl: String(displayImage && displayImage.url || ''),
        displayUrl: String(displayImage && displayImage.url || ''),
        slotUrl: String(slots[activeIndex] && slots[activeIndex].url || displayImage && displayImage.url || ''),
    };
}

function applyImageCountOverride(imageState, override) {
    const expected = normalizeNullableNumber(override);
    if (!expected || expected <= 0 || !imageState || !Array.isArray(imageState.slots) || !imageState.slots.length) {
        return imageState;
    }
    const slots = imageState.slots.slice(0, expected);
    while (slots.length < expected) {
        const slotIndex = slots.length;
        slots.push({
            url: '',
            providerId: '',
            source: 'manual-image-count',
            filename: '',
            imageId: '',
            locationHash: '',
            slotIndex,
            buttonIndex: null,
            title: `图 ${slotIndex + 1}`,
            promptText: '',
            rawBlock: '',
            tagName: 'image',
            order: null,
        });
    }
    const currentIndex = Math.max(0, Math.min(slots.length - 1, normalizeFiniteIndex(imageState.currentIndex)));
    const currentSlot = slots[currentIndex] || null;
    const boundCount = slots.filter((slot) => String(slot && slot.url || '').trim()).length;
    const unboundImages = Array.isArray(imageState.unboundImages) ? cloneData(imageState.unboundImages) : [];
    return {
        ...imageState,
        slots,
        images: cloneData(slots),
        count: slots.length,
        expectedCount: slots.length,
        boundCount,
        unboundCount: unboundImages.length,
        availableCount: boundCount + unboundImages.length,
        currentIndex,
        currentUrl: String(currentSlot && currentSlot.url || ''),
        displayUrl: String(currentSlot && currentSlot.url || ''),
        slotUrl: String(currentSlot && currentSlot.url || ''),
    };
}

function buildImageActionContext(current, unifiedSettings = null) {
    const snapshot = current && current.snapshot || {};
    const content = snapshot.content || {};
    return {
        mode: current && current.mode || 'pc',
        message: current && current.payload && current.payload.message || null,
        messageId: snapshot.messageId,
        prompt: content.text || '',
        currentIndex: content.currentIndex || 0,
        textIndex: normalizeFiniteIndex(content.currentIndex || 0),
        imageIndex: normalizeFiniteIndex(firstDefined(content.activeImageIndex, content.currentIndex, 0)),
        imageState: {
            images: cloneData(content.images || []),
            slots: cloneData(content.imageSlots || []),
            unboundImages: cloneData(content.unboundImages || []),
            count: Number(content.imageCount || 0) || 0,
            expectedCount: Number(content.imageExpectedCount || content.imageCount || 0) || 0,
            boundCount: Number(content.imageBoundCount || 0) || 0,
            unboundCount: Number(content.imageUnboundCount || 0) || 0,
            availableCount: Number(content.imageAvailableCount || 0) || 0,
            signature: String(content.imageSignature || ''),
            currentIndex: normalizeFiniteIndex(firstDefined(content.activeImageIndex, content.currentIndex, 0)),
            currentUrl: String(content.currentImageUrl || content.backgroundImage || ''),
            displayUrl: String(content.currentImageUrl || content.backgroundImage || ''),
            slotUrl: String(content.currentSlotImageUrl || ''),
        },
        currentUrl: String(content.currentImageUrl || content.backgroundImage || ''),
        scene: current && current.payload && current.payload.scene || null,
        render: current && current.payload && current.payload.render || null,
        unifiedSettings: unifiedSettings || null,
    };
}

function resolveReaderActionToast(result, messages) {
    if (!result) return messages.fallback;
    if (result.ok === false) {
        return result.reason || messages.fallback;
    }
    return messages.success;
}

function cloneReaderPayload(payload = {}) {
    const clone = {};
    for (const [key, value] of Object.entries(payload || {})) {
        clone[key] = key === 'message' ? (value || null) : cloneData(value);
    }
    return clone;
}

function normalizeDisplayText(value) {
    const text = String(value || '').trim();
    return looksLikeHostUiHtml(text) ? '' : text;
}

function firstRenderableText(...values) {
    for (const value of values) {
        const normalized = normalizeDisplayText(value);
        if (String(normalized || '').trim()) return normalized;
    }
    return '';
}

function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
        if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
}

function normalizeOpacity(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(1, Math.max(0, numeric));
}

function normalizeFiniteNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeNullableNumber(value) {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'auto') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function normalizeFiniteIndex(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.floor(numeric);
}

function resolveSegmentImageIndex(payload, textIndex) {
    const segmentImageSlots = Array.isArray(payload && payload.segmentImageSlots)
        ? payload.segmentImageSlots
        : [];
    const mapped = Number(segmentImageSlots[textIndex]);
    if (Number.isFinite(mapped) && mapped >= 0) return Math.floor(mapped);
    return normalizeFiniteIndex(firstDefined(
        payload && payload.imageState && payload.imageState.currentIndex,
        textIndex,
        0,
    ));
}

function mapSnapshotImageEntry(image, fallbackIndex, requireUrl) {
    const url = String(image && image.url || '').trim();
    if (requireUrl && !url) return null;
    return {
        url,
        providerId: String(image && image.providerId || '').trim(),
        source: String(image && image.source || '').trim(),
        filename: String(image && image.filename || '').trim(),
        imageId: String(image && image.imageId || '').trim(),
        locationHash: String(image && image.locationHash || '').trim(),
        slotIndex: normalizeFiniteIndex(firstDefined(image && image.slotIndex, fallbackIndex, 0)),
        buttonIndex: normalizeNullableNumber(image && image.buttonIndex),
        title: String(image && image.title || '').trim(),
        promptText: String(image && image.promptText || '').trim(),
        rawBlock: String(image && image.rawBlock || '').trim(),
        tagName: String(image && image.tagName || '').trim(),
        order: normalizeNullableNumber(image && image.order),
    };
}

function resolveSnapshotDisplayImage(slots, activeIndex) {
    const source = Array.isArray(slots) ? slots : [];
    const slot = source[activeIndex];
    return String(slot && slot.url || '').trim() ? slot : null;
}

function resolveIndexedSnapshotUnboundImage(unboundImages, activeIndex, slotCount) {
    const source = Array.isArray(unboundImages) ? unboundImages : [];
    if (!source.length || source.length !== slotCount) return null;
    return source[normalizeFiniteIndex(activeIndex)] || null;
}

function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
}

function firstNonEmptyString(...values) {
    for (const value of values) {
        const text = String(value || '').trim();
        if (text) return text;
    }
    return '';
}

function esc(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cloneData(value) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(cloneData);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)]));
    }
    return value;
}
