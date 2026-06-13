import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { bootstrapIGS, createMemoryStorage, createPresetRegistry, PRESET_STORE_KEY } from '../src/index.js';
import { createShujukuClient } from '../src/data/shujuku/client.js';
import { createResourceCache } from '../src/media/resource-cache.js';
import { VISUAL_MODES } from '../src/visual/visual-mode.js';

const appRoot = path.resolve(import.meta.dirname, '..');

test('gate:simulation:minimal loop reads fake message, resolves scene, renders layer, and sends choice text', async () => {
    const message = readJson('fixtures/tavern/standard-message.json');
    const sent = [];
    const rendered = [];
    const globalObject = {};
    const igs = bootstrapIGS({
        global: globalObject,
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async (text) => {
                sent.push(text);
                return { ok: true };
            },
        },
        layers: {
            dialogue: {
                render(stage) {
                    rendered.push({ layer: 'dialogue', stage });
                },
            },
        },
    });

    const result = await igs.refresh({
        backgroundRules: [
            { id: 'bg.library.rain', priority: 20, match: { location: ['图书馆'], time: ['夜晚'], weather: ['雨'] } },
        ],
        characterRules: [
            { id: 'char.eli.smile', character: '艾莉', emotion: '微笑' },
        ],
    });
    const sendResult = await igs.typeAndSend('选择：继续调查');

    assert.equal(globalObject.IGS, igs);
    assert.equal(result.ok, true);
    assert.equal(result.scene.speaker, '艾莉');
    assert.equal(result.scene.background.id, 'bg.library.rain');
    assert.equal(rendered.length, 1);
    assert.equal(result.render.stage.layers.dialogue.text, '艾莉: 我们从这里开始。');
    assert.equal(result.render.stage.layers.hud.toolbar.layout, 'horizontal');
    assert.equal(result.render.stage.attributes['data-igs-toolbar-placement'], 'top-right');
    assert.equal(rendered[0].stage.layers.dialogue.speaker, '艾莉');
    assert.deepEqual(sendResult, { ok: true });
    assert.deepEqual(sent, ['选择：继续调查']);
    assert.deepEqual(igs.destroy(), { ok: true });
});

test('gate:simulation:reader-stage-generated-image-slot', async () => {
    const message = readJson('fixtures/tavern/generated-message.json');
    const igs = bootstrapIGS({
        global: {},
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const result = await igs.refresh();
    assert.equal(result.scene.visualMode, VISUAL_MODES.GENERATED_FIRST);
    assert.equal(result.scene.generatedImage.value, 'prompt://moon-rooftop');
    assert.equal(result.render.stage.layers.generated.visible, true);
    assert.equal(result.render.stage.layers.background.visible, false);
    assert.equal(result.render.stage.layers.character.visible, false);
    igs.destroy();
});

test('gate:simulation:fake shujuku update calls refresh worldbook', async () => {
    const calls = [];
    const client = createShujukuClient({
        updateRow: async (tableName, rowIndex, patch) => {
            calls.push(['updateRow', tableName, rowIndex, patch]);
            return { success: true };
        },
        refreshDataAndWorldbook: async () => {
            calls.push(['refreshDataAndWorldbook']);
            return { success: true };
        },
    });

    const fixture = readJson('fixtures/shujuku/basic-table.json');
    const result = await client.updateRowAndRefresh('角色状态', 1, fixture.rowPatch);

    assert.equal(result.ok, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[1][0], 'refreshDataAndWorldbook');
});

test('gate:simulation:resource cache preserves local resource entry', () => {
    const pack = readJson('fixtures/media/resource-pack.json');
    const cache = createResourceCache();

    const putResult = cache.put(pack.items[0].id, pack.items[0]);
    assert.equal(putResult.ok, true);
    assert.equal(cache.get('bg.library.night').url, 'placeholder://library-night');
    assert.equal(cache.list().length, 1);
});

test('gate:simulation:visual-novel-open-latest-and-open-message-use-compat-api', async () => {
    const latestMessage = readJson('fixtures/tavern/standard-message.json');
    const specificMessage = readJson('fixtures/visual-novel/vn-message.json');
    const rendered = [];
    const igs = bootstrapIGS({
        global: {},
        hostAdapter: {
            getCurrentMessage: async () => latestMessage,
            getMessageById: async (messageId) => {
                return Number(messageId) === specificMessage.id ? specificMessage : null;
            },
            typeAndSend: async () => ({ ok: true }),
        },
        layers: {
            dialogue: {
                render(stage) {
                    rendered.push(stage);
                },
            },
        },
    });

    const latestResult = await igs.openLatestAvailable('mobile');
    const byIdResult = await igs.openViewerFromMessage(specificMessage.id, 'pc');
    const missingResult = await igs.openViewerFromMessage(999, 'pc');

    assert.equal(latestResult.ok, true);
    assert.equal(latestResult.scene.speaker, '艾莉');
    assert.equal(latestResult.reader.snapshot.mode, 'mobile');
    assert.ok(latestResult.reader.snapshot.selectors.includes('#vnm-overlay'));
    assert.equal(byIdResult.ok, true);
    assert.equal(byIdResult.scene.speaker, '玉子');
    assert.equal(byIdResult.scene.generatedImage.value, 'prompt://library-rain-night');
    assert.ok(byIdResult.reader.snapshot.selectors.includes('#vnm-send-btn'));
    assert.equal(missingResult.ok, false);
    assert.equal(missingResult.reason, 'message-not-found');
    assert.equal(rendered.length, 2);
    assert.equal(rendered[0].layers.dialogue.visible, true);
    assert.equal(rendered[1].layers.generated.visible, true);

    igs.destroy();
});

test('gate:simulation:magic-wand-entry-opens-latest-reader', async () => {
    const document = createFakeDocument();
    const menu = document.createElement('div');
    menu.id = 'extensionsMenu';
    document.body.appendChild(menu);
    const legacyEntry = document.createElement('a');
    legacyEntry.setAttribute('data-igs-magic-entry', '1');
    legacyEntry.setAttribute('data-igs-version', '0.2.10');
    menu.appendChild(legacyEntry);

    const latestMessage = readJson('fixtures/tavern/standard-message.json');
    const sent = [];
    const igs = bootstrapIGS({
        global: {
            document,
            setInterval: () => 1,
            clearInterval: () => {},
        },
        magicWandEntryOptions: {
            retryIntervalMs: false,
        },
        hostAdapter: {
            getCurrentMessage: async () => latestMessage,
            typeAndSend: async (text) => {
                sent.push(text);
                return { ok: true };
            },
        },
    });

    const entry = menu.querySelector('[data-vnm-magic-entry="1"]');
    assert.ok(entry);
    assert.equal(entry.getAttribute('data-vnm-version'), '0.2.14');
    assert.match(entry.innerHTML, /fa-book-open/);
    assert.match(entry.innerHTML, /沉浸式 Galgame 系统/);
    assert.equal(igs.getMagicWandEntryState().attached, true);
    assert.equal(menu.querySelectorAll('[data-vnm-magic-entry="1"]').length, 1);
    assert.equal(menu.querySelector('[data-igs-magic-entry="1"]'), null);

    const clickResult = entry.click();
    await clickResult;
    const state = igs.getState();

    assert.equal(state.visualNovelUi.activeReader.mode, 'pc');
    assert.equal(state.visualNovelUi.activeReader.snapshot.content.speaker, '艾莉');
    assert.equal(sent.length, 0);

    igs.destroy();
    assert.equal(menu.querySelector('[data-vnm-magic-entry="1"]'), null);
});

test('gate:simulation:visual-novel-reader-falls-back-to-visible-text-when-raw-message-is-host-ui-html', async () => {
    const latestMessage = readJson('fixtures/tavern/host-ui-leak-message.json');
    const igs = bootstrapIGS({
        global: {},
        autoAttachMagicWand: false,
        hostAdapter: {
            getCurrentMessage: async () => latestMessage,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const opened = await igs.openLatestAvailable('pc');
    const snapshot = opened.reader.snapshot;

    assert.equal(opened.ok, true);
    assert.match(snapshot.content.displayText, /玉子: 今晚我们先从这里开始。/);
    assert.equal(snapshot.content.displayText.includes('API Connections'), false);
    assert.equal(snapshot.content.displayText.includes('rightNavHolder'), false);
    assert.equal(snapshot.content.displayText.includes('<div'), false);
    assert.equal(snapshot.content.errors.some((item) => item.code === 'host-ui-html-leaked'), false);

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-open-settings-renders-four-tabs', () => {
    const legacyStorage = readJson('fixtures/visual-novel/legacy-storage.json');
    const storage = createMemoryStorage(legacyStorage);
    const igs = bootstrapIGS({
        global: { localStorage: storage },
        hostAdapter: {
            getCurrentMessage: async () => null,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const result = igs.openSettings({ tab: 'basic', mode: 'pc' });

    assert.equal(result.ok, true);
    assert.deepEqual(result.snapshot.tabs.map((item) => item.label), ['基础', '正文替换', '图像', '阅读器']);
    assert.equal(result.snapshot.tabs[0].active, true);
    assert.ok(result.snapshot.selectors.includes('#vnm-unified-settings'));

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-settings-save-updates-reader-state', () => {
    const legacyStorage = readJson('fixtures/visual-novel/legacy-storage.json');
    const storage = createMemoryStorage(legacyStorage);
    const igs = bootstrapIGS({
        global: { localStorage: storage },
        hostAdapter: {
            getCurrentMessage: async () => null,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const opened = igs.openSettings({ tab: 'reader', mode: 'mobile' });
    const switched = opened.controller.setValue('readerMode', 'mobile');
    const updated = opened.controller.setValue('readerSettings.fontSize', 20);
    const current = igs.getUnifiedSettings({ mode: 'mobile' });
    const savedStorage = JSON.parse(storage.getItem('vnm-reader-settings-v9-mobile'));

    assert.equal(switched.ok, true);
    assert.equal(updated.ok, true);
    assert.equal(current.readerSettings.fontSize, 20);
    assert.equal(savedStorage.fontSize, 20);
    assert.equal(updated.snapshot.readerMode, 'mobile');

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-enter-sends-and-shift-enter-does-not', async () => {
    const latestMessage = readJson('fixtures/tavern/standard-message.json');
    const sent = [];
    const igs = bootstrapIGS({
        global: {},
        hostAdapter: {
            getCurrentMessage: async () => latestMessage,
            typeAndSend: async (text) => {
                sent.push(text);
                return { ok: true };
            },
        },
    });

    const opened = await igs.openLatestAvailable('pc');
    const controller = opened.reader.controller;
    controller.setInputValue('第一行');
    const shiftResult = await controller.keydown({ key: 'Enter', shiftKey: true, value: '第一行' });
    controller.setInputValue('第二行');
    const enterResult = await controller.keydown({ key: 'Enter', shiftKey: false, value: '第二行' });

    assert.equal(shiftResult.sent, false);
    assert.equal(enterResult.sent, true);
    assert.deepEqual(sent, ['第二行']);

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-toolbar-actions-open-settings-toggle-and-close', async () => {
    const latestMessage = {
        id: 8,
        text: '[角色: 艾莉]\n艾莉: 第一句。 第二句。',
    };
    const storage = createMemoryStorage();
    const igs = bootstrapIGS({
        global: { localStorage: storage },
        autoAttachMagicWand: false,
        hostAdapter: {
            getCurrentMessage: async () => latestMessage,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const opened = await igs.openLatestAvailable('pc');
    const controller = opened.reader.controller;
    assert.equal(opened.reader.snapshot.content.progress, '1 / 2');
    assert.equal(igs.getState().visualNovelUi.activeReader.toolbarCollapsed, true);

    const settingsResult = await controller.invokeAction('settings');
    assert.equal(settingsResult.ok, true);
    assert.equal(igs.getState().visualNovelUi.activeSettings.tab, 'basic');

    const modeResult = settingsResult.controller.setValue('bridge.openMode', 'mobile');
    assert.equal(modeResult.ok, true);
    assert.equal(igs.getState().visualNovelUi.activeReader.mode, 'mobile');

    const toggleResult = await controller.invokeAction('toggle-bar');
    assert.equal(toggleResult.ok, true);
    assert.equal(toggleResult.collapsed, false);

    const hideResult = await controller.invokeAction('hide');
    assert.equal(hideResult.ok, true);
    assert.equal(hideResult.hidden, true);

    const nextResult = await controller.invokeAction('next');
    assert.equal(nextResult.ok, true);
    assert.equal(nextResult.moved, true);
    assert.equal(nextResult.progress, '2 / 2');

    const prevTurnResult = await controller.invokeAction('prev-turn');
    const closeResult = await controller.invokeAction('close');
    const finalState = igs.getState();

    assert.equal(prevTurnResult.ok, true);
    assert.equal(prevTurnResult.reason, 'turn-switch-host-required');
    assert.equal(closeResult.ok, true);
    assert.equal(finalState.visualNovelUi.activeReader, null);
    assert.equal(finalState.visualNovelUi.activeSettings, null);

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-turn-navigation-switches-message-and_keeps_original_entry_mode', async () => {
    const messages = [
        { id: 7, text: '[角色: 艾莉]\n艾莉: 上一轮第一句。 上一轮第二句。' },
        { id: 8, text: '[角色: 艾莉]\n艾莉: 当前第一句。 当前第二句。' },
        { id: 9, text: '[角色: 艾莉]\n艾莉: 下一轮第一句。 下一轮第二句。' },
    ];
    const jumped = [];
    const igs = bootstrapIGS({
        global: {},
        autoAttachMagicWand: false,
        hostAdapter: {
            getCurrentMessage: async () => messages[1],
            getMessageById: async (messageId) => messages.find((message) => message.id === Number(messageId)) || null,
            getAdjacentMessage: async (messageId, delta) => {
                const index = messages.findIndex((message) => message.id === Number(messageId));
                return index < 0 ? null : messages[index + (delta < 0 ? -1 : 1)] || null;
            },
            jumpToMessage: async (messageId) => {
                jumped.push(Number(messageId));
                return { ok: true, messageId: Number(messageId) };
            },
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const opened = await igs.openLatestAvailable('pc');
    const nextTurnResult = await opened.reader.controller.invokeAction('next-turn');
    const prevTurnResult = await nextTurnResult.reader.controller.invokeAction('prev-turn');
    const state = igs.getState();

    assert.equal(opened.reader.snapshot.messageId, 8);
    assert.equal(nextTurnResult.ok, true);
    assert.equal(nextTurnResult.moved, true);
    assert.equal(nextTurnResult.reader.snapshot.messageId, 9);
    assert.equal(nextTurnResult.reader.snapshot.content.progress, '1 / 2');
    assert.equal(prevTurnResult.ok, true);
    assert.equal(prevTurnResult.moved, true);
    assert.equal(prevTurnResult.reader.snapshot.messageId, 8);
    assert.equal(prevTurnResult.reader.snapshot.content.progress, '2 / 2');
    assert.deepEqual(jumped, [9, 8]);
    assert.equal(state.visualNovelUi.activeReader.snapshot.messageId, 8);

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-collects-provider-images-and-save-returns-downloadable-url', async () => {
    const document = createFakeDocument();
    const message = {
        id: 20,
        text: '[角色: 玉子]\n玉子: 看看这张图。',
        element: createFakeMessageElement(document, {
            imageUrls: [
                'https://example.com/scene-1.png',
                'https://example.com/scene-2.png',
            ],
        }),
    };
    const igs = bootstrapIGS({
        global: { document },
        autoAttachMagicWand: false,
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const opened = await igs.openLatestAvailable('pc');
    const saveResult = await opened.reader.controller.invokeAction('save');

    assert.equal(opened.ok, true);
    assert.equal(opened.reader.snapshot.content.imageCount, 2);
    assert.equal(opened.reader.snapshot.content.currentImageUrl, 'https://example.com/scene-1.png');
    assert.equal(opened.reader.snapshot.content.backgroundImage, 'https://example.com/scene-1.png');
    assert.equal(saveResult.ok, true);
    assert.equal(saveResult.url, 'https://example.com/scene-1.png');
    assert.equal(saveResult.filename, 'igs-20-1.png');

    igs.destroy();
});

test('gate:simulation:visual-novel-ui-regen-polls-external-provider-and-updates-background', async () => {
    const document = createFakeDocument();
    const messageRoot = createFakeMessageElement(document, {
        imageUrls: ['https://example.com/old-scene.png'],
    });
    const message = {
        id: 21,
        text: '[角色: 玉子]\n玉子: 重新画一张。',
        element: messageRoot,
    };
    const button = createFakeRegenerateButton(() => {
        messageRoot.__images[0].currentSrc = 'https://example.com/new-scene.png';
        messageRoot.__images[0].src = 'https://example.com/new-scene.png';
    });
    messageRoot.__regenButtons.push(button);

    const igs = bootstrapIGS({
        global: { document, setTimeout },
        autoAttachMagicWand: false,
        config: {
            imageApi: {
                mode: 'extension',
                pollIntervalMs: 1,
                pollAttempts: 3,
            },
        },
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const opened = await igs.openLatestAvailable('pc');
    const regenResult = await opened.reader.controller.invokeAction('regen');
    const state = igs.getState();

    assert.equal(opened.reader.snapshot.content.currentImageUrl, 'https://example.com/old-scene.png');
    assert.equal(regenResult.ok, true);
    assert.equal(regenResult.reason, 'external-image-updated');
    assert.equal(regenResult.imageState.currentUrl, 'https://example.com/new-scene.png');
    assert.equal(state.visualNovelUi.activeReader.snapshot.content.currentImageUrl, 'https://example.com/new-scene.png');
    assert.equal(state.visualNovelUi.activeReader.snapshot.content.backgroundImage, 'https://example.com/new-scene.png');
    assert.equal(button.clickCount, 1);

    igs.destroy();
});

test('gate:simulation:text-preset-pipeline-refresh', async () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const textFilterPreset = readJson('fixtures/text/text-filter-preset.json');
    const textFormatPreset = readJson('fixtures/text/text-format-preset.json');
    const sceneRegexPreset = readJson('fixtures/text/scene-regex-preset.json');
    const rendered = [];
    const igs = bootstrapIGS({
        global: {},
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async () => ({ ok: true }),
        },
        layers: {
            dialogue: {
                render(stage) {
                    rendered.push(stage);
                },
            },
        },
    });

    const result = await igs.refresh({
        textFilterPreset,
        textFormatPreset,
        sceneRegexPreset,
        backgroundRules: [
            { id: 'bg.library.rain', priority: 20, match: { location: ['图书馆'], time: ['夜晚'], weather: ['雨'] } },
        ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.scene.speaker, '玉子');
    assert.equal(result.scene.emotion, '开心');
    assert.equal(result.scene.location, '图书馆');
    assert.equal(result.scene.time, '夜晚');
    assert.equal(result.scene.weather, '雨');
    assert.equal(result.scene.text, '你好，欢迎来到图书馆。');
    assert.equal(result.scene.background.id, 'bg.library.rain');
    assert.equal(result.scene.textPipelineErrors.length, 0);
    assert.equal(result.render.stage.layers.dialogue.text, '你好，欢迎来到图书馆。');
    assert.equal(rendered[0].layers.dialogue.speaker, '玉子');

    igs.destroy();
});

test('gate:simulation:preset-registry-current-drives-refresh', async () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const snapshot = readJson('fixtures/presets/preset-registry-snapshot.json');
    const storage = createMemoryStorage({
        [PRESET_STORE_KEY]: JSON.stringify(snapshot),
    });
    const rendered = [];
    const igs = bootstrapIGS({
        global: { localStorage: storage },
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async () => ({ ok: true }),
        },
        layers: {
            dialogue: {
                render(stage) {
                    rendered.push(stage);
                },
            },
        },
    });

    const result = await igs.refresh({
        backgroundRules: [
            { id: 'bg.library.rain', priority: 20, match: { location: ['图书馆'], time: ['夜晚'], weather: ['雨'] } },
        ],
    });

    assert.equal(result.ok, true);
    assert.equal(result.scene.speaker, '玉子');
    assert.equal(result.scene.text, '你好，欢迎来到图书馆。');
    assert.equal(result.scene.location, '图书馆');
    assert.equal(result.scene.textPipelineErrors.length, 0);
    assert.equal(result.render.stage.layers.dialogue.speaker, '玉子');
    assert.equal(rendered.length, 1);

    igs.destroy();
});

test('gate:simulation:bad-import-keeps-last-working-refresh', async () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const snapshot = readJson('fixtures/presets/preset-registry-snapshot.json');
    const badBundle = readJson('fixtures/presets/bad-current-overwrite-bundle.json');
    const storage = createMemoryStorage({
        [PRESET_STORE_KEY]: JSON.stringify(snapshot),
    });
    const presetRegistry = createPresetRegistry({ storage });
    const igs = bootstrapIGS({
        global: { localStorage: storage },
        presetRegistry,
        hostAdapter: {
            getCurrentMessage: async () => message,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    const importResult = presetRegistry.importBundle(badBundle);
    const result = await igs.refresh({
        backgroundRules: [
            { id: 'bg.library.rain', priority: 20, match: { location: ['图书馆'], time: ['夜晚'], weather: ['雨'] } },
        ],
    });

    assert.equal(importResult.ok, false);
    assert.equal(importResult.rejected.length, 1);
    assert.equal(presetRegistry.snapshot().current['text-format-preset'], 'preset.text-format.bubble-line');
    assert.equal(result.ok, true);
    assert.equal(result.scene.speaker, '玉子');
    assert.equal(result.scene.text, '你好，欢迎来到图书馆。');
    assert.equal(result.scene.textPipelineErrors.length, 0);

    igs.destroy();
});

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

function createFakeDocument() {
    const document = {
        defaultView: null,
        head: null,
        body: null,
        createElement(tagName) {
            return createFakeElement(tagName, document);
        },
        getElementById(id) {
            return findFirst(document.body, (element) => element.id === id)
                || findFirst(document.head, (element) => element.id === id)
                || null;
        },
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            return [
                ...queryAll(document.head, selector),
                ...queryAll(document.body, selector),
            ];
        },
        addEventListener() {},
        removeEventListener() {},
    };
    document.defaultView = { document };
    document.head = createFakeElement('head', document);
    document.body = createFakeElement('body', document);
    return document;
}

function createFakeElement(tagName, ownerDocument) {
    const listeners = new Map();
    const element = {
        tagName: String(tagName || '').toUpperCase(),
        ownerDocument,
        parentNode: null,
        parentElement: null,
        children: [],
        attributes: new Map(),
        style: {},
        innerHTML: '',
        textContent: '',
        href: '',
        className: '',
        id: '',
        get classList() {
            return {
                contains: (name) => splitClasses(element.className).includes(name),
            };
        },
        appendChild(child) {
            child.parentNode = element;
            child.parentElement = element;
            element.children.push(child);
            return child;
        },
        remove() {
            if (!element.parentNode) return;
            element.parentNode.children = element.parentNode.children.filter((child) => child !== element);
            element.parentNode = null;
            element.parentElement = null;
        },
        setAttribute(name, value) {
            element.attributes.set(name, String(value));
            if (name === 'id') element.id = String(value);
            if (name === 'class') element.className = String(value);
        },
        getAttribute(name) {
            if (name === 'id') return element.id || null;
            if (name === 'class') return element.className || null;
            return element.attributes.has(name) ? element.attributes.get(name) : null;
        },
        addEventListener(type, handler) {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(handler);
        },
        removeEventListener(type, handler) {
            const next = (listeners.get(type) || []).filter((item) => item !== handler);
            listeners.set(type, next);
        },
        click() {
            const event = {
                target: element,
                currentTarget: element,
                preventDefault() {},
                stopPropagation() {},
            };
            const results = (listeners.get('click') || []).map((handler) => handler(event));
            return results[results.length - 1];
        },
        closest(selector) {
            let cursor = element;
            while (cursor) {
                if (matchesAnySelector(cursor, selector)) return cursor;
                cursor = cursor.parentNode;
            }
            return null;
        },
        querySelector(selector) {
            return element.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            return queryAll(element, selector);
        },
    };
    return element;
}

function queryAll(root, selector) {
    if (!root) return [];
    const output = [];
    for (const child of root.children || []) {
        if (matchesAnySelector(child, selector)) output.push(child);
        output.push(...queryAll(child, selector));
    }
    return output;
}

function findFirst(root, predicate) {
    if (!root) return null;
    if (predicate(root)) return root;
    for (const child of root.children || []) {
        const found = findFirst(child, predicate);
        if (found) return found;
    }
    return null;
}

function matchesAnySelector(element, selector) {
    return String(selector || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .some((item) => matchesSelector(element, item));
}

function matchesSelector(element, selector) {
    if (!element) return false;
    if (selector === '#extensionsMenu') return element.id === 'extensionsMenu';
    if (selector === '#extensions_menu') return element.id === 'extensions_menu';
    if (selector === '.extensions_block .list-group') {
        return element.classList.contains('list-group')
            && Boolean(element.parentNode && element.parentNode.classList && element.parentNode.classList.contains('extensions_block'));
    }
    if (selector === '[data-vnm-magic-entry="1"]') {
        return element.getAttribute('data-vnm-magic-entry') === '1';
    }
    if (selector === '[data-igs-magic-entry="1"]') {
        return element.getAttribute('data-igs-magic-entry') === '1';
    }
    if (selector.startsWith('#')) return element.id === selector.slice(1);
    if (selector.startsWith('.')) return element.classList.contains(selector.slice(1));
    if (selector.startsWith('[')) {
        const match = selector.match(/^\[([^=\]]+)="([^"]*)"\]$/);
        return match ? element.getAttribute(match[1]) === match[2] : false;
    }
    return element.tagName.toLowerCase() === selector.toLowerCase();
}

function splitClasses(value) {
    return String(value || '').split(/\s+/).filter(Boolean);
}

function createFakeMessageElement(ownerDocument, options = {}) {
    const images = (options.imageUrls || []).map((url) => ({
        currentSrc: url,
        src: url,
    }));
    const regenButtons = [];
    return {
        ownerDocument,
        __images: images,
        __regenButtons: regenButtons,
        querySelector(selector) {
            if (selector === '.mes_text') return null;
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            if (selector === 'img.st-chatu8-image-tag-image, [class*="st-chatu8"] img, [class*="chatu8"] img') {
                return images;
            }
            if (selector === 'button.image-tag-button, button[class*="image-tag-button"], button[class*="st-chatu8-image"]') {
                return regenButtons;
            }
            if (selector === '.tsp-regenerate-btn, .tsp-inline-gen-btn') {
                return [];
            }
            return [];
        },
    };
}

function createFakeRegenerateButton(onClick) {
    return {
        clickCount: 0,
        click() {
            this.clickCount += 1;
            onClick();
        },
    };
}
