import { DEFAULT_VIRTUAL_REGEX } from '../../scene/message-source.js';
import { cloneData } from './reader-value-utils.js';
import { DEFAULT_SCENE_PROMPT_RULE, TOOLBAR_ACTIONS } from './reader-host-constants.js';

export async function handleSettingsAction(action, ctx) {
    const {
        state,
        options,
        closeSettings,
        persistSettingsDraft,
        rerenderSettings,
        buildRegexPreview,
    } = ctx;

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
