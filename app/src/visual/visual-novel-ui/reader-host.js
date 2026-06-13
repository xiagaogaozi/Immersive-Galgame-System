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
]);

const SETTINGS_PANEL_REQUIRED_SELECTORS = Object.freeze([
    '#vnm-unified-settings',
    '.vnm-settings-shell',
    '.vnm-settings-head',
    '.vnm-settings-tabs',
    '.vnm-settings-body',
    '.vnm-segmented',
    '.vnm-source-filter',
    '.vnm-settings-preview',
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
    reader: Object.freeze({
        label: '阅读器',
        requiredPaths: READER_REQUIRED_SETTINGS_PATHS,
    }),
});

const TOOLBAR_ACTIONS = Object.freeze([
    ['prev', '上一段'],
    ['next', '下一段'],
    ['regen', '重新生成背景图'],
    ['save', '保存背景图'],
    ['settings', '设置'],
    ['hide', '隐藏'],
    ['prev-turn', '上一轮'],
    ['next-turn', '下一轮'],
]);

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
        };
        updateMountedReader(snapshot);

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
            const index = currentPins.indexOf(id);
            if (index >= 0) currentPins.splice(index, 1);
            else currentPins.push(id);
            settingsState.draft.readerSettings.pinnedBtns = currentPins;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
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
        if (normalizedAction === 'save') {
            return saveCurrentImage();
        }
        if (['prev-turn', 'next-turn'].includes(normalizedAction)) {
            return moveReaderTurn(normalizedAction === 'prev-turn' ? -1 : 1);
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

    function buildReaderSnapshot(payload, mode, readerSettings, index = 0) {
        const scene = cloneData(payload.scene || (payload.render && payload.render.scene) || {});
        const render = payload.render || {};
        const stage = render.stage || {};
        const extracted = buildVisualNovelTextPayload(payload.message || payload.raw || '', {
            sourceFilter: payload.sourceFilter,
            virtualRegex: payload.virtualRegex,
            visibleText: payload.visibleText,
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
        const currentText = segments[normalizedIndex] || text;
        const displayText = scene.speaker && currentText
            ? `${scene.speaker}: ${currentText}`
            : currentText;
        const backgroundImage = firstNonEmptyString(
            imageState.displayUrl,
            imageState.currentUrl,
            scene.generatedImage && scene.generatedImage.value,
            stage.layers && stage.layers.generated && stage.layers.generated.resource && stage.layers.generated.resource.value,
            stage.layers && stage.layers.background && stage.layers.background.resource && stage.layers.background.resource.url,
            '',
        );
        const overlayClasses = ['vnm-mode-' + mode];
        if (mode === 'pc' || mode === 'mobile') overlayClasses.push('vnm-floating');
        if (mode === 'mobile') overlayClasses.push('vnm-floating-mobile');

        return {
            mode,
            messageId: firstDefined(payload.messageId, payload.message && payload.message.id, scene.messageId, null),
            selectors: Array.from(ORIGINAL_READER_REQUIRED_SELECTORS),
            classes: overlayClasses,
            styles: {
                '#vnm-overlay': {
                    zIndex: ORIGINAL_READER_STYLE_CONTRACT.overlayZIndex,
                    background: '#000',
                },
                '.vnm-dialog': {
                    width: ORIGINAL_READER_STYLE_CONTRACT.dialogWidth,
                    borderRadius: '22px',
                    padding: '22px 26px 18px',
                },
                '.vnm-input': {
                    height: ORIGINAL_READER_STYLE_CONTRACT.inputHeight,
                },
                '.vnm-send-btn': {
                    minWidth: ORIGINAL_READER_STYLE_CONTRACT.sendButtonMinWidth,
                },
                '.vnm-icon-btn': {
                    width: ORIGINAL_READER_STYLE_CONTRACT.toolbarButtonSize,
                    height: ORIGINAL_READER_STYLE_CONTRACT.toolbarButtonSize,
                },
            },
            content: {
                speaker: scene.speaker || '',
                text: currentText,
                fullText: text,
                displayText,
                segments: cloneData(segments),
                currentIndex: normalizedIndex,
                progress: buildProgressText(normalizedIndex, segments.length, imageState),
                backgroundImage,
                images: cloneData(imageState.images),
                imageSlots: cloneData(imageState.slots),
                unboundImages: cloneData(imageState.unboundImages),
                imageCount: imageState.count,
                imageSignature: imageState.signature,
                activeImageIndex: imageState.currentIndex,
                currentImageUrl: imageState.displayUrl || imageState.currentUrl,
                currentSlotImageUrl: imageState.slotUrl,
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
            html: `<div id="vnm-overlay" class="${overlayClasses.join(' ')}" data-igs-vn-ui="true">${getOriginalReaderHtml()}</div>`,
            source: getOriginalReaderSource(options.version || '0.3.12'),
        };
    }

    function buildSettingsSnapshot(settingsState) {
        const draft = normalizeUnifiedSettings(settingsState.draft, settingsState.readerMode);
        const tab = normalizeSettingsTab(settingsState.tab);
        const body = renderSettingsBody(tab, draft, settingsState.asyncState);
        const tabsHtml = SETTINGS_TAB_DEFS.map(([id, label]) => {
            return `<button type="button" class="vnm-settings-tab${tab === id ? ' is-active' : ''}" data-tab="${id}">${label}</button>`;
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
            html: `<div id="vnm-unified-settings" data-igs-vn-ui="true">${renderTemplate(getSettingsShellTemplate(), {
                version: esc(options.version || '0.3.12'),
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
                openModeField: `<div class="vnm-settings-full vnm-segmented-field">${field(
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
                apiGroupClass: 'vnm-settings-api-group' + (apiDisabled ? ' is-disabled' : ''),
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
            pinnedButtonsField: renderPinnedButtons(reader.pinnedBtns),
        });
    }

    function mountReaderDom(snapshot, controller) {
        const doc = getRootDocument(options.global);
        if (!doc) return null;
        ensureStyleTag(doc, 'vnm-overlay-style', getOriginalReaderStyleText());
        const existing = doc.getElementById('vnm-overlay');
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
            if (event.target && event.target.id === 'vnm-input') {
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
        ensureStyleTag(doc, 'vnm-unified-settings-style', getSettingsStyleText());
        const existing = doc.getElementById('vnm-unified-settings');
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
                    const wrap = action.closest('.vnm-settings-secret');
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
            const path = event.target && event.target.getAttribute ? event.target.getAttribute('data-path') : '';
            if (!path) return;
            controller.setValue(path, event.target.value);
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
        let overlay = container.querySelector('#vnm-overlay');
        if (!overlay) {
            overlay = buildFallbackReaderOverlay(container.ownerDocument || getRootDocument(options.global));
            if (overlay) container.appendChild(overlay);
        }
        return {
            overlay,
            dialog: overlay ? overlay.querySelector('#vnm-dialog') : null,
            input: overlay ? overlay.querySelector('#vnm-input') : null,
            sendButton: overlay ? overlay.querySelector('#vnm-send-btn') : null,
            toast: overlay ? overlay.querySelector('#vnm-toast') : null,
            clickLayer: overlay ? overlay.querySelector('#vnm-click-layer') : null,
            text: overlay ? overlay.querySelector('#vnm-text') : null,
            progress: overlay ? overlay.querySelector('#vnm-progress') : null,
        };
    }

    function buildFallbackReaderOverlay(doc) {
        if (!doc || typeof doc.createElement !== 'function') return null;
        const overlay = doc.createElement('div');
        overlay.id = 'vnm-overlay';

        const bgBlur = doc.createElement('div');
        bgBlur.id = 'vnm-bg-blur';
        overlay.appendChild(bgBlur);

        const bg = doc.createElement('div');
        bg.id = 'vnm-bg';
        overlay.appendChild(bg);

        const clickLayer = doc.createElement('div');
        clickLayer.id = 'vnm-click-layer';
        overlay.appendChild(clickLayer);

        const dialog = doc.createElement('div');
        dialog.id = 'vnm-dialog';
        dialog.className = 'vnm-dialog';
        overlay.appendChild(dialog);

        const ctrlBar = doc.createElement('div');
        ctrlBar.id = 'vnm-ctrl-bar';
        ctrlBar.className = 'vnm-ctrl-bar';
        dialog.appendChild(ctrlBar);

        const barBtns = doc.createElement('div');
        barBtns.id = 'vnm-bar-btns';
        ctrlBar.appendChild(barBtns);
        for (const button of ORIGINAL_READER_TOOLBAR_BUTTONS) {
            barBtns.appendChild(createReaderButton(doc, button.id, button.title, button.html));
        }

        const settings = doc.createElement('div');
        settings.id = 'vnm-settings';
        settings.setAttribute('aria-hidden', 'true');
        ctrlBar.appendChild(settings);

        const pinned = doc.createElement('div');
        pinned.id = 'vnm-bar-pinned';
        ctrlBar.appendChild(pinned);

        ctrlBar.appendChild(createReaderButton(doc, 'toggle-bar', '收纳/展开按钮', ORIGINAL_READER_ICONS.toggleBar));
        ctrlBar.appendChild(createReaderButton(doc, 'close', '退出', ORIGINAL_READER_ICONS.close));

        const progress = doc.createElement('div');
        progress.id = 'vnm-progress';
        progress.className = 'vnm-progress';
        dialog.appendChild(progress);

        const text = doc.createElement('div');
        text.id = 'vnm-text';
        text.className = 'vnm-text';
        dialog.appendChild(text);

        const controls = doc.createElement('div');
        controls.className = 'vnm-controls';
        dialog.appendChild(controls);

        const sendStatus = doc.createElement('div');
        sendStatus.id = 'vnm-send-status';
        sendStatus.setAttribute('aria-live', 'polite');
        controls.appendChild(sendStatus);

        const spinner = doc.createElement('span');
        spinner.className = 'vnm-spinner';
        sendStatus.appendChild(spinner);

        const sendStatusText = doc.createElement('span');
        sendStatusText.id = 'vnm-send-status-text';
        sendStatusText.textContent = '已发送，等待 AI 回复…';
        sendStatus.appendChild(sendStatusText);

        const input = doc.createElement('input');
        input.id = 'vnm-input';
        input.className = 'vnm-input';
        input.type = 'text';
        input.placeholder = '输入内容后按 Enter 发送';
        controls.appendChild(input);

        const sendButton = doc.createElement('button');
        sendButton.id = 'vnm-send-btn';
        sendButton.className = 'vnm-send-btn';
        sendButton.type = 'button';
        sendButton.textContent = '发送';
        controls.appendChild(sendButton);

        const toast = doc.createElement('div');
        toast.id = 'vnm-toast';
        toast.setAttribute('aria-live', 'polite');
        dialog.appendChild(toast);

        return overlay;
    }

    function createReaderButton(doc, id, title, html) {
        const button = doc.createElement('button');
        button.id = `vnm-btn-${id}`;
        button.className = 'vnm-icon-btn';
        button.type = 'button';
        button.setAttribute('data-act', id);
        button.setAttribute('title', title);
        button.innerHTML = html;
        return button;
    }

    function buildFallbackSettingsOverlay(doc, snapshot) {
        if (!doc || typeof doc.createElement !== 'function') return null;
        const overlay = doc.createElement('div');
        overlay.id = 'vnm-unified-settings';
        overlay.setAttribute('data-igs-vn-ui', 'true');

        const shell = doc.createElement('div');
        shell.className = 'vnm-settings-shell';
        shell.setAttribute('role', 'dialog');
        shell.setAttribute('aria-modal', 'true');
        shell.setAttribute('aria-label', '设置');
        overlay.appendChild(shell);

        const head = doc.createElement('div');
        head.className = 'vnm-settings-head';
        shell.appendChild(head);

        const title = doc.createElement('div');
        title.className = 'vnm-settings-title';
        title.textContent = '设置';
        head.appendChild(title);

        const badge = doc.createElement('div');
        badge.className = 'vnm-settings-badge';
        badge.textContent = options.version || '0.3.12';
        head.appendChild(badge);

        const close = doc.createElement('button');
        close.className = 'vnm-settings-close';
        close.type = 'button';
        close.setAttribute('data-action', 'close');
        close.setAttribute('aria-label', '关闭');
        close.textContent = '×';
        head.appendChild(close);

        const tabs = doc.createElement('div');
        tabs.className = 'vnm-settings-tabs';
        shell.appendChild(tabs);
        for (const tab of snapshot.tabs || []) {
            const button = doc.createElement('button');
            button.className = `vnm-settings-tab${tab.active ? ' is-active' : ''}`;
            button.type = 'button';
            button.setAttribute('data-tab', tab.id);
            button.textContent = tab.label;
            tabs.appendChild(button);
        }

        const body = doc.createElement('div');
        body.className = 'vnm-settings-body';
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
        clearChildren(container);
        container.innerHTML = snapshot.html;
        current.dom.overlay = container.querySelector('#vnm-unified-settings');
        if (!current.dom.overlay) {
            current.dom.overlay = buildFallbackSettingsOverlay(container.ownerDocument || getRootDocument(options.global), snapshot);
            if (current.dom.overlay) container.appendChild(current.dom.overlay);
        }
        if (current.dom.overlay) {
            attachSettingsViewportEvents(current.dom, current.dom.overlay);
        }
    }

    function applyReaderSnapshotToDom(root, snapshot, current) {
        root.className = snapshot.classes.join(' ');
        root.setAttribute('data-igs-vn-ui', 'true');

        const bg = root.querySelector('#vnm-bg');
        const bgBlur = root.querySelector('#vnm-bg-blur');
        const textEl = root.querySelector('#vnm-text');
        const progress = root.querySelector('#vnm-progress');
        const input = root.querySelector('#vnm-input');
        const send = root.querySelector('#vnm-send-btn');
        const dialog = root.querySelector('#vnm-dialog');
        const toolbar = root.querySelector('#vnm-ctrl-bar');
        const clickLayer = root.querySelector('#vnm-click-layer');
        const toast = root.querySelector('#vnm-toast');

        if (bg && snapshot.content.backgroundImage) {
            bg.style.backgroundImage = `url("${snapshot.content.backgroundImage.replace(/"/g, '&quot;')}")`;
        } else if (bg) {
            bg.style.backgroundImage = '';
        }
        if (bgBlur && snapshot.content.backgroundImage) {
            bgBlur.style.backgroundImage = `url("${snapshot.content.backgroundImage.replace(/"/g, '&quot;')}")`;
            bgBlur.style.opacity = '0.72';
        } else if (bgBlur) {
            bgBlur.style.backgroundImage = '';
            bgBlur.style.opacity = '0';
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
                    event.target.closest('.vnm-controls')
                    || event.target.closest('#vnm-ctrl-bar')
                    || event.target.closest('#vnm-settings')
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
            dialog.classList.toggle('vnm-hidden', current.hidden);
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
        const collapsible = root.querySelector('#vnm-bar-btns');
        const pinned = root.querySelector('#vnm-bar-pinned');
        const pins = new Set(
            current.snapshot
            && current.snapshot.readerSettings
            && Array.isArray(current.snapshot.readerSettings.pinnedBtns)
                ? current.snapshot.readerSettings.pinnedBtns
                : [],
        );

        for (const [id] of TOOLBAR_ACTIONS) {
            const button = root.querySelector(`#vnm-btn-${id}`);
            if (!button) continue;
            if (pins.has(id) && pinned) {
                pinned.appendChild(button);
            } else if (collapsible) {
                collapsible.appendChild(button);
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
        const dialog = refs.dialog || root.querySelector('#vnm-dialog');
        const textEl = refs.textEl || root.querySelector('#vnm-text');
        const toolbar = refs.toolbar || root.querySelector('#vnm-ctrl-bar');
        const controls = root.querySelector('.vnm-controls');
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
        const layer = root.querySelector('#vnm-click-layer');
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
            : () => ({ bridge: {}, readerSettings: {}, readerMode: 'pc', version: options.version || '0.3.12' });
        const snapshot = getter(optionsForSnapshot) || {};
        return normalizeUnifiedSettings(snapshot, optionsForSnapshot.mode);
    }

    function normalizeUnifiedSettings(snapshot, preferredMode) {
        const bridge = normalizeBridgeConfig(snapshot.bridge);
        const readerMode = normalizeReaderMode(firstDefined(snapshot.readerMode, preferredMode, bridge.openMode), bridge);
        const readerSettings = normalizeReaderSettings(readerMode, snapshot.readerSettings);

        return {
            version: snapshot.version || options.version || '0.3.12',
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

    function normalizeReaderSettings(mode, settings) {
        const inlineMode = mode === 'pc' || mode === 'mobile';
        const base = {
            fontSize: inlineMode ? 15 : 18,
            dialogWidth: null,
            dialogHeight: null,
            glassOpacity: 0.62,
            toolbarScale: inlineMode ? 60 : 100,
            inputScale: inlineMode ? 60 : 100,
            imgMode: 'adaptive',
            stayMode: false,
            imageCountOverride: null,
            pinnedBtns: [],
        };
        const normalized = {
            ...base,
            ...cloneData(settings || {}),
        };
        normalized.fontSize = normalizeFiniteNumber(normalized.fontSize, base.fontSize);
        normalized.dialogWidth = normalizeNullableNumber(normalized.dialogWidth);
        normalized.dialogHeight = normalizeNullableNumber(normalized.dialogHeight);
        normalized.glassOpacity = normalizeOpacity(normalized.glassOpacity, base.glassOpacity);
        normalized.toolbarScale = normalizeFiniteNumber(normalized.toolbarScale, base.toolbarScale);
        normalized.inputScale = normalizeFiniteNumber(normalized.inputScale, base.inputScale);
        normalized.imgMode = normalized.imgMode === 'contain' ? 'contain' : 'adaptive';
        normalized.stayMode = normalizeBoolean(normalized.stayMode, false);
        normalized.imageCountOverride = normalizeNullableNumber(normalized.imageCountOverride);
        normalized.pinnedBtns = Array.isArray(normalized.pinnedBtns) ? normalized.pinnedBtns.filter(Boolean) : [];
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
}

function renderTemplate(template, values) {
    return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : '';
    });
}

function field(path, label, inputHtml, note) {
    return `<label class="vnm-settings-field"><span>${esc(label)}</span>${inputHtml}${note ? `<em>${esc(note)}</em>` : ''}</label>`;
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
    return `<div class="vnm-settings-secret">${textInput(path, value, placeholder, 'password', disabled)}<button type="button" class="vnm-settings-secret-toggle" data-action="toggle-secret" aria-label="显示或隐藏密钥" aria-pressed="false"${disabledAttr(disabled)}>显示</button></div>`;
}

function numberInput(path, value, min, max, disabled) {
    return `<input data-path="${esc(path)}" type="number" min="${esc(min)}" max="${esc(max)}" value="${esc(value)}"${disabledAttr(disabled)}>`;
}

function checkbox(path, value, label) {
    return `<button type="button" class="vnm-switch${value ? ' is-on' : ''}" data-switch="${esc(path)}" aria-pressed="${value ? 'true' : 'false'}"><i></i><span>${esc(label)}</span></button>`;
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
    return `<div class="vnm-segmented" role="radiogroup" aria-label="${esc(label || '')}" data-count="${esc(items.length)}" data-active-index="${esc(activeIndex)}" style="--vnm-segment-count:${esc(items.length)};--vnm-active-index:${esc(activeIndex)};"><span class="vnm-segmented-indicator" aria-hidden="true"></span>${items.map((item) => {
        const selected = String(item[0]) === String(value);
        const icon = item[2] ? `<span class="vnm-segmented-btn-icon" aria-hidden="true">${item[2]}</span>` : '';
        return `<button type="button" class="vnm-segmented-btn${item[2] ? ' has-icon' : ''}${selected ? ' is-active' : ''}" data-segment-path="${esc(path)}" data-segment-value="${esc(item[0])}" role="radio" aria-checked="${selected ? 'true' : 'false'}" aria-pressed="${selected ? 'true' : 'false'}">${icon}<span class="vnm-segmented-btn-label">${esc(item[1])}</span></button>`;
    }).join('')}</div>`;
}

function modelPicker(path, value, models, action, placeholder, disabled) {
    const items = Array.isArray(models) ? models.filter(Boolean) : [];
    const options = ['<option value="">从已拉取模型中选择</option>'].concat(items.map((model) => {
        const selected = model === value ? ' selected' : '';
        return `<option value="${esc(model)}"${selected}>${esc(model)}</option>`;
    })).join('');
    return `<div class="vnm-settings-model"><div class="vnm-settings-model-row"><input data-path="${esc(path)}" value="${esc(value || '')}" placeholder="${esc(placeholder || '')}"${disabledAttr(disabled)}><button type="button" class="vnm-settings-action vnm-settings-inline-action" data-action="${esc(action)}"${disabledAttr(disabled)}>拉取模型</button></div><select data-model-sync="${esc(path)}"${items.length && !disabled ? '' : ' disabled'}>${options}</select></div>`;
}

function renderPinnedButtons(value) {
    const pins = Array.isArray(value) ? value : [];
    const buttons = TOOLBAR_ACTIONS.map(([id, label]) => {
        const active = pins.includes(id);
        return `<button type="button" class="vnm-settings-action vnm-settings-inline-action${active ? ' is-active' : ''}" data-action="toggle-toolbar-pin:${esc(id)}" aria-pressed="${active ? 'true' : 'false'}">${esc(label)}</button>`;
    }).join('');
    return `<div class="vnm-settings-field"><span>常驻按钮</span><div class="vnm-settings-row">${buttons}</div><em>亮起的按钮会固定在原版工具栏常驻区，未常驻按钮由收纳按钮展开。</em></div>`;
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
    root.style.setProperty('--vnm-settings-vleft', `${Math.round(left)}px`);
    root.style.setProperty('--vnm-settings-vtop', `${Math.round(top)}px`);
    root.style.setProperty('--vnm-settings-vw', `${Math.round(width)}px`);
    root.style.setProperty('--vnm-settings-vh', `${Math.round(height)}px`);
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
    const toast = current.dom && current.dom.overlay ? current.dom.overlay.querySelector('#vnm-toast') : null;
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
    const toast = current.dom && current.dom.overlay ? current.dom.overlay.querySelector('#vnm-toast') : null;
    if (toast) {
        toast.textContent = '';
        toast.style.opacity = '0';
    }
}

function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function buildProgressText(currentIndex, totalSegments, imageState) {
    const segmentProgress = `${currentIndex + 1} / ${totalSegments}`;
    if (!imageState || !imageState.count) return segmentProgress;
    return `${segmentProgress}   [${imageState.currentIndex + 1}/${imageState.count} 图]`;
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
    return {
        slots,
        images,
        unboundImages,
        count: totalCount,
        signature: String(imageState && imageState.signature || ''),
        currentIndex: activeIndex,
        currentUrl: String(displayImage && displayImage.url || ''),
        displayUrl: String(displayImage && displayImage.url || ''),
        slotUrl: String(slots[activeIndex] && slots[activeIndex].url || displayImage && displayImage.url || ''),
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
            signature: String(content.imageSignature || ''),
            currentIndex: normalizeFiniteIndex(firstDefined(content.activeImageIndex, content.currentIndex, 0)),
            currentUrl: String(content.currentImageUrl || content.backgroundImage || ''),
            displayUrl: String(content.currentImageUrl || content.backgroundImage || ''),
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
