import { DEFAULT_VIRTUAL_REGEX } from '../../scene/message-source.js';
import { cloneData } from './reader-value-utils.js';
import { DEFAULT_SCENE_PROMPT_RULE, TOOLBAR_ACTIONS } from './reader-host-constants.js';
import { DEFAULT_MOOD_GROUPS, normalizeMoodGroups } from '../../scene/mood-groups.js';
import { loadScenePresets, saveScenePresets } from '../../scene/scene-preset-store.js';

function decodeSeg(value) {
    try { return decodeURIComponent(String(value == null ? '' : value)); }
    catch (error) { return String(value == null ? '' : value); }
}

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
        settingsState.draft.bridge.sceneAssets.scenes[newName] = { url: '', times: {} };
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-remove-bg:')) {
        const name = decodeSeg(normalizedAction.slice('scene-remove-bg:'.length));
        settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
        settingsState.draft.bridge.sceneAssets.scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
        delete settingsState.draft.bridge.sceneAssets.scenes[name];
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-rename-bg:')) {
        const oldName = decodeSeg(normalizedAction.slice('scene-rename-bg:'.length));
        const globalObj = options.global || globalThis;
        const newName = (globalObj.prompt && globalObj.prompt(`重命名场景「${oldName}」为：`, oldName) || '').trim();
        if (newName && newName !== oldName) {
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            const scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
            scenes[newName] = scenes[oldName] || { url: '', times: {} };
            delete scenes[oldName];
            settingsState.draft.bridge.sceneAssets.scenes = scenes;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-set-bg-url:')) {
        const rest = normalizedAction.slice('scene-set-bg-url:'.length);
        const colonIdx = rest.indexOf(':');
        if (colonIdx > 0) {
            const name = decodeSeg(rest.slice(0, colonIdx));
            const url = rest.slice(colonIdx + 1);
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.scenes = settingsState.draft.bridge.sceneAssets.scenes || {};
            const scene = settingsState.draft.bridge.sceneAssets.scenes[name];
            if (scene && typeof scene === 'object') {
                scene.url = url;
            } else {
                settingsState.draft.bridge.sceneAssets.scenes[name] = { url, times: {} };
            }
            persistSettingsDraft();
        }
        return { ok: true };
    }

    if (normalizedAction.startsWith('scene-add-time:')) {
        const sceneName = decodeSeg(normalizedAction.slice('scene-add-time:'.length));
        const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
        const scene = scenes[sceneName];
        if (scene && typeof scene === 'object') {
            scene.times = scene.times || {};
            const existingKeys = Object.keys(scene.times);
            scene.times['时间' + (existingKeys.length + 1)] = { url: '', weathers: {} };
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-remove-time:')) {
        const rest = normalizedAction.slice('scene-remove-time:'.length);
        const colonIdx = rest.indexOf(':');
        if (colonIdx > 0) {
            const sceneName = decodeSeg(rest.slice(0, colonIdx));
            const timeName = decodeSeg(rest.slice(colonIdx + 1));
            const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
            const scene = scenes[sceneName];
            if (scene && scene.times) delete scene.times[timeName];
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-rename-time:')) {
        const rest = normalizedAction.slice('scene-rename-time:'.length);
        const colonIdx = rest.indexOf(':');
        if (colonIdx > 0) {
            const sceneName = decodeSeg(rest.slice(0, colonIdx));
            const oldTime = decodeSeg(rest.slice(colonIdx + 1));
            const globalObj = options.global || globalThis;
            const newTime = (globalObj.prompt && globalObj.prompt(`重命名时间「${oldTime}」为：`, oldTime) || '').trim();
            if (newTime && newTime !== oldTime) {
                const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
                const scene = scenes[sceneName];
                if (scene && scene.times) {
                    scene.times[newTime] = scene.times[oldTime] || { url: '', weathers: {} };
                    delete scene.times[oldTime];
                    const persisted = persistSettingsDraft();
                    if (persisted.ok === false) return persisted;
                }
            }
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-set-time-url:')) {
        const rest = normalizedAction.slice('scene-set-time-url:'.length);
        const first = rest.indexOf(':');
        if (first > 0) {
            const sceneName = decodeSeg(rest.slice(0, first));
            const after = rest.slice(first + 1);
            const second = after.indexOf(':');
            if (second > 0) {
                const timeName = decodeSeg(after.slice(0, second));
                const url = after.slice(second + 1);
                const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
                const scene = scenes[sceneName];
                if (scene && scene.times && scene.times[timeName] != null) {
                    const t = scene.times[timeName];
                    if (typeof t === 'object') t.url = url;
                    else scene.times[timeName] = { url, weathers: {} };
                }
                persistSettingsDraft();
            }
        }
        return { ok: true };
    }

    if (normalizedAction.startsWith('scene-add-weather:')) {
        const rest = normalizedAction.slice('scene-add-weather:'.length);
        const colonIdx = rest.indexOf(':');
        if (colonIdx > 0) {
            const sceneName = decodeSeg(rest.slice(0, colonIdx));
            const timeName = decodeSeg(rest.slice(colonIdx + 1));
            const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
            const scene = scenes[sceneName];
            if (scene && scene.times && scene.times[timeName]) {
                const timeEntry = scene.times[timeName];
                if (typeof timeEntry === 'object') {
                    timeEntry.weathers = timeEntry.weathers || {};
                    const existingKeys = Object.keys(timeEntry.weathers);
                    timeEntry.weathers['天气' + (existingKeys.length + 1)] = '';
                    const persisted = persistSettingsDraft();
                    if (persisted.ok === false) return persisted;
                }
            }
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-remove-weather:')) {
        const rest = normalizedAction.slice('scene-remove-weather:'.length);
        const first = rest.indexOf(':');
        if (first > 0) {
            const sceneName = decodeSeg(rest.slice(0, first));
            const after = rest.slice(first + 1);
            const second = after.indexOf(':');
            if (second > 0) {
                const timeName = decodeSeg(after.slice(0, second));
                const weatherName = decodeSeg(after.slice(second + 1));
                const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
                const scene = scenes[sceneName];
                if (scene && scene.times && scene.times[timeName]) {
                    const t = scene.times[timeName];
                    if (t && t.weathers) delete t.weathers[weatherName];
                }
                const persisted = persistSettingsDraft();
                if (persisted.ok === false) return persisted;
            }
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-rename-weather:')) {
        const rest = normalizedAction.slice('scene-rename-weather:'.length);
        const first = rest.indexOf(':');
        if (first > 0) {
            const sceneName = decodeSeg(rest.slice(0, first));
            const after = rest.slice(first + 1);
            const second = after.indexOf(':');
            if (second > 0) {
                const timeName = decodeSeg(after.slice(0, second));
                const oldWeather = decodeSeg(after.slice(second + 1));
                const globalObj = options.global || globalThis;
                const newWeather = (globalObj.prompt && globalObj.prompt(`重命名天气「${oldWeather}」为：`, oldWeather) || '').trim();
                if (newWeather && newWeather !== oldWeather) {
                    const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
                    const scene = scenes[sceneName];
                    if (scene && scene.times && scene.times[timeName]) {
                        const t = scene.times[timeName];
                        if (t && t.weathers) {
                            t.weathers[newWeather] = t.weathers[oldWeather] || '';
                            delete t.weathers[oldWeather];
                            const persisted = persistSettingsDraft();
                            if (persisted.ok === false) return persisted;
                        }
                    }
                }
            }
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-set-weather-url:')) {
        const rest = normalizedAction.slice('scene-set-weather-url:'.length);
        const first = rest.indexOf(':');
        if (first > 0) {
            const sceneName = decodeSeg(rest.slice(0, first));
            const after = rest.slice(first + 1);
            const second = after.indexOf(':');
            if (second > 0) {
                const timeName = decodeSeg(after.slice(0, second));
                const after2 = after.slice(second + 1);
                const third = after2.indexOf(':');
                if (third > 0) {
                    const weatherName = decodeSeg(after2.slice(0, third));
                    const url = after2.slice(third + 1);
                    const scenes = settingsState.draft.bridge.sceneAssets && settingsState.draft.bridge.sceneAssets.scenes || {};
                    const scene = scenes[sceneName];
                    if (scene && scene.times && scene.times[timeName]) {
                        const t = scene.times[timeName];
                        if (t && t.weathers) t.weathers[weatherName] = url;
                    }
                    persistSettingsDraft();
                }
            }
        }
        return { ok: true };
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
        const name = decodeSeg(normalizedAction.slice('scene-remove-char:'.length));
        settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
        settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
        delete settingsState.draft.bridge.sceneAssets.characters[name];
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-add-mood:')) {
        const charName = decodeSeg(normalizedAction.slice('scene-add-mood:'.length));
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
            const charName = decodeSeg(rest.slice(0, colonIdx));
            const mood = decodeSeg(rest.slice(colonIdx + 1));
            settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
            settingsState.draft.bridge.sceneAssets.characters = settingsState.draft.bridge.sceneAssets.characters || {};
            const char = settingsState.draft.bridge.sceneAssets.characters[charName];
            if (char && typeof char === 'object') delete char[mood];
        }
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-set-mood-url:')) {
        const rest = normalizedAction.slice('scene-set-mood-url:'.length);
        const firstColon = rest.indexOf(':');
        if (firstColon > 0) {
            const charName = decodeSeg(rest.slice(0, firstColon));
            const afterChar = rest.slice(firstColon + 1);
            const secondColon = afterChar.indexOf(':');
            if (secondColon > 0) {
                const mood = decodeSeg(afterChar.slice(0, secondColon));
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

    if (normalizedAction.startsWith('scene-rename-char:')) {
        const oldName = decodeSeg(normalizedAction.slice('scene-rename-char:'.length));
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
            const charName = decodeSeg(rest.slice(0, colonIdx));
            const oldMood = decodeSeg(rest.slice(colonIdx + 1));
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

    if (normalizedAction === 'reset-mood-groups') {
        settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
        settingsState.draft.bridge.sceneAssets.moodGroups = cloneData(DEFAULT_MOOD_GROUPS);
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction === 'mood-add-group') {
        const groups = ensureMoodGroups(settingsState);
        const existing = new Set(groups.map((g) => g.label));
        let i = groups.length + 1;
        let name = '情绪组' + i;
        while (existing.has(name)) { i++; name = '情绪组' + i; }
        groups.push({ label: name, words: [] });
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('mood-remove-group:')) {
        const label = decodeSeg(normalizedAction.slice('mood-remove-group:'.length));
        const groups = ensureMoodGroups(settingsState);
        const idx = groups.findIndex((g) => g.label === label);
        if (idx >= 0) groups.splice(idx, 1);
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('mood-rename-group:')) {
        const oldLabel = decodeSeg(normalizedAction.slice('mood-rename-group:'.length));
        const globalObj = options.global || globalThis;
        const newLabel = (globalObj.prompt && globalObj.prompt(`重命名情绪组「${oldLabel}」为：`, oldLabel) || '').trim();
        if (newLabel && newLabel !== oldLabel) {
            const groups = ensureMoodGroups(settingsState);
            if (groups.some((g) => g.label === newLabel)) {
                if (globalObj.alert) globalObj.alert(`情绪组「${newLabel}」已存在`);
                return rerenderSettings();
            }
            const group = groups.find((g) => g.label === oldLabel);
            if (group) group.label = newLabel;
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('mood-add-word:')) {
        const label = decodeSeg(normalizedAction.slice('mood-add-word:'.length));
        const globalObj = options.global || globalThis;
        const word = (globalObj.prompt && globalObj.prompt(`向「${label}」组添加情绪词（2-3 个汉字）：`, '') || '').trim();
        if (word) {
            const groups = ensureMoodGroups(settingsState);
            if (!/^[一-龥]{2,3}$/.test(word)) {
                if (globalObj.alert) globalObj.alert('情绪词必须是 2-3 个汉字');
                return rerenderSettings();
            }
            if (groups.some((g) => g.words.includes(word))) {
                if (globalObj.alert) globalObj.alert(`「${word}」已存在于某个情绪组`);
                return rerenderSettings();
            }
            const group = groups.find((g) => g.label === label);
            if (group) group.words.push(word);
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('mood-remove-word:')) {
        const rest = normalizedAction.slice('mood-remove-word:'.length);
        const colonIdx = rest.indexOf(':');
        if (colonIdx > 0) {
            const label = decodeSeg(rest.slice(0, colonIdx));
            const word = decodeSeg(rest.slice(colonIdx + 1));
            const groups = ensureMoodGroups(settingsState);
            const group = groups.find((g) => g.label === label);
            if (group) {
                if (group.words.length <= 1) {
                    const globalObj = options.global || globalThis;
                    if (globalObj.alert) globalObj.alert('每个情绪组至少保留 1 个词');
                    return rerenderSettings();
                }
                const wi = group.words.indexOf(word);
                if (wi >= 0) group.words.splice(wi, 1);
            }
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction === 'toggle-mood-groups') {
        settingsState.asyncState.moodGroupsExpanded = !settingsState.asyncState.moodGroupsExpanded;
        return rerenderSettings();
    }

    if (normalizedAction === 'scene-import-mood-slots') {
        settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
        const characters = settingsState.draft.bridge.sceneAssets.characters || {};
        const groups = ensureMoodGroups(settingsState);
        let touched = false;
        for (const charName of Object.keys(characters)) {
            const char = characters[charName];
            if (!char || typeof char !== 'object') continue;
            for (const group of groups) {
                if (!(group.label in char)) { char[group.label] = ''; touched = true; }
            }
        }
        if (touched) {
            const persisted = persistSettingsDraft();
            if (persisted.ok === false) return persisted;
        }
        return rerenderSettings();
    }

    if (normalizedAction.startsWith('scene-preset-apply:')) {
        const name = decodeSeg(normalizedAction.slice('scene-preset-apply:'.length));
        settingsState.asyncState.scenePresetName = name;
        if (name) {
            const globalObj = options.global || globalThis;
            const presets = loadScenePresets(globalObj.localStorage);
            const preset = presets[name];
            if (preset) {
                settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
                settingsState.draft.bridge.sceneAssets.scenes = cloneData(preset.scenes || {});
                settingsState.draft.bridge.sceneAssets.characters = cloneData(preset.characters || {});
                settingsState.draft.bridge.sceneAssets.moodGroups = cloneData(preset.moodGroups || []);
                const persisted = persistSettingsDraft();
                if (persisted.ok === false) return persisted;
            }
        }
        return rerenderSettings();
    }

    if (normalizedAction === 'scene-preset-rename') {
        const oldName = settingsState.asyncState.scenePresetName || '';
        if (!oldName) return rerenderSettings();
        const globalObj = options.global || globalThis;
        const newName = (globalObj.prompt && globalObj.prompt(`重命名预设「${oldName}」为：`, oldName) || '').trim();
        if (!newName || newName === oldName) return rerenderSettings();
        const storage = globalObj.localStorage;
        const presets = loadScenePresets(storage);
        if (!presets[oldName]) return rerenderSettings();
        presets[newName] = presets[oldName];
        delete presets[oldName];
        saveScenePresets(storage, presets);
        settingsState.asyncState.scenePresetName = newName;
        return rerenderSettings();
    }

    if (normalizedAction === 'scene-preset-import') {
        const globalObj = options.global || globalThis;
        const doc = globalObj.document;
        if (!doc) return { ok: false, reason: 'no-document' };
        const fileResult = await pickPresetFile(doc);
        if (!fileResult) return rerenderSettings();
        const name = (globalObj.prompt && globalObj.prompt('预设名称：', fileResult.fileName) || '').trim();
        if (!name) return rerenderSettings();
        const storage = globalObj.localStorage;
        const presets = loadScenePresets(storage);
        presets[name] = {
            scenes: fileResult.data.scenes || {},
            characters: fileResult.data.characters || {},
            moodGroups: fileResult.data.moodGroups || [],
        };
        saveScenePresets(storage, presets);
        settingsState.asyncState.scenePresetName = name;
        settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
        settingsState.draft.bridge.sceneAssets.scenes = cloneData(presets[name].scenes);
        settingsState.draft.bridge.sceneAssets.characters = cloneData(presets[name].characters);
        settingsState.draft.bridge.sceneAssets.moodGroups = cloneData(presets[name].moodGroups);
        const persisted = persistSettingsDraft();
        if (persisted.ok === false) return persisted;
        return rerenderSettings();
    }

    if (normalizedAction === 'scene-preset-export') {
        const name = settingsState.asyncState.scenePresetName || '';
        if (!name) return rerenderSettings();
        const globalObj = options.global || globalThis;
        const presets = loadScenePresets(globalObj.localStorage);
        const preset = presets[name];
        if (!preset) return rerenderSettings();
        const doc = globalObj.document;
        if (!doc) return { ok: false, reason: 'no-document' };
        const json = JSON.stringify({ scenes: preset.scenes || {}, characters: preset.characters || {}, moodGroups: preset.moodGroups || [] }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = doc.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        doc.body.appendChild(a);
        a.click();
        doc.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { ok: true };
    }

    if (normalizedAction === 'scene-preset-delete') {
        const name = settingsState.asyncState.scenePresetName || '';
        if (!name) return rerenderSettings();
        const globalObj = options.global || globalThis;
        if (globalObj.confirm && !globalObj.confirm(`删除预设「${name}」？`)) return rerenderSettings();
        const storage = globalObj.localStorage;
        const presets = loadScenePresets(storage);
        delete presets[name];
        saveScenePresets(storage, presets);
        settingsState.asyncState.scenePresetName = '';
        return rerenderSettings();
    }

    return { ok: false, reason: 'unknown-settings-action', action: normalizedAction };
}

function pickPresetFile(doc) {
    return new Promise((resolve) => {
        const input = doc.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        let done = false;
        const finish = (val) => { if (!done) { done = true; resolve(val); } };
        input.onchange = () => {
            const file = input.files && input.files[0];
            if (!file) { finish(null); return; }
            const fileName = file.name.replace(/\.json$/i, '');
            const fr = new FileReader();
            fr.onload = (e) => { try { finish({ fileName, data: JSON.parse(e.target.result) }); } catch { finish(null); } };
            fr.onerror = () => finish(null);
            fr.readAsText(file);
        };
        input.click();
        setTimeout(() => finish(null), 300000);
    });
}

function ensureMoodGroups(settingsState) {    settingsState.draft.bridge.sceneAssets = settingsState.draft.bridge.sceneAssets || {};
    const sa = settingsState.draft.bridge.sceneAssets;
    if (!Array.isArray(sa.moodGroups)) {
        sa.moodGroups = normalizeMoodGroups(sa.moodGroups);
    }
    return sa.moodGroups;
}
