import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

import { bootstrapIGS } from '../src/index.js';
import { dispatchImportBundle } from '../src/registry/import-dispatcher.js';
import { checkStyleContract } from '../src/styles/style-contract.js';
import { readLegacyVisualNovelSettings } from '../src/storage/legacy-visual-novel.js';
import { createReaderState } from '../src/visual/reader-state.js';
import { createStageModel } from '../src/visual/stage-model.js';
import { getOriginalReaderSource } from '../src/visual/visual-novel-ui/original-reader-source.js';
import { getSettingsShellTemplate } from '../src/visual/visual-novel-ui/settings-shell.js';
import { getSettingsStyleText } from '../src/visual/visual-novel-ui/settings-style.js';
import { getSettingsTabTemplate, SETTINGS_TAB_DEFS } from '../src/visual/visual-novel-ui/settings-tabs.js';

const appRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(appRoot, '..');

test('gate:import-contract:dispatches allowed types and rejects forbidden types', () => {
    const bundle = readJson('fixtures/imports/sample-bundle.json');
    const handled = [];
    const result = dispatchImportBundle(bundle, {
        'background-pack': (item) => handled.push(item.id),
    });

    assert.equal(result.ok, false);
    assert.deepEqual(handled, ['pack.library']);
    assert.equal(result.accepted.length, 1);
    assert.equal(result.rejected[0].item.type, 'hotkey-preset');
});

test('gate:import-contract:text-presets', () => {
    const bundle = readJson('fixtures/imports/text-presets-bundle.json');
    const handled = [];
    const result = dispatchImportBundle(bundle, {
        'text-filter-preset': (item) => handled.push(item.type),
        'text-format-preset': (item) => handled.push(item.type),
        'scene-regex-preset': (item) => handled.push(item.type),
    });

    assert.equal(result.ok, true);
    assert.deepEqual(handled, ['text-filter-preset', 'text-format-preset', 'scene-regex-preset']);
    assert.equal(result.accepted.length, 3);
    assert.deepEqual(result.rejected, []);
});

test('gate:style-contract:requires stable slots and reader bridge attributes', () => {
    const skin = readJson('fixtures/styles/skin-contract.json');
    const result = checkStyleContract(skin);

    assert.equal(result.ok, true);
    assert.deepEqual(result.missingSlots, []);
    assert.deepEqual(result.missingData, []);
});

test('gate:visual-slots-contract:stage-model', () => {
    const fixture = readJson('fixtures/visual/stage-model.json');
    const readerState = createReaderState(fixture.standard.readerStateInput);
    const stage = createStageModel(fixture.standard.scene, readerState);
    const result = checkStyleContract(stage);

    assert.equal(result.ok, true);
    assert.deepEqual(result.missingSlots, []);
    assert.deepEqual(result.missingData, []);
    assert.equal(stage.layers.hud.toolbar.attributes['data-placement'], 'top-right');
});

test('gate:loader-json:matches loader source and references public bundle', () => {
    const loaderSource = fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.js'), 'utf8');
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));

    assert.equal(loaderJson.type, 'script');
    assert.equal(loaderJson.name, '沉浸式 Galgame 系统（自动更新）');
    assert.equal(loaderJson.content, loaderSource);
    assert.match(loaderJson.content, /igs\.bundle\.js/);
    assert.match(loaderJson.content, /igs\.bundle\.css/);
    assert.match(loaderJson.content, /DEFAULT_REF = 'main'/);
    assert.doesNotMatch(loaderJson.content, /DEFAULT_REF = 'v\d+\.\d+\.\d+'/);
    assert.match(loaderJson.content, /MAIN_BRANCH_URL/);
    assert.match(loaderJson.content, /fetchLatestRef/);
    assert.doesNotMatch(loaderJson.content, /notifyDuplicateLoadBlocked/);
    assert.match(loaderJson.content, /reconcileExistingRuntime/);
    assert.match(loaderJson.content, /ensureMagicWandEntry/);
    assert.doesNotMatch(loaderJson.content, /yuzi-phone/i);
    assert.equal(loaderJson.button.enabled, false);
    assert.deepEqual(loaderJson.button.buttons, []);
});

test('gate:dist-bundle:is-self-contained-for-loader-cache-bust', () => {
    const bundle = fs.readFileSync(path.join(appRoot, 'dist', 'igs.bundle.js'), 'utf8');

    assert.doesNotMatch(bundle, /^\s*import\s/m);
    assert.doesNotMatch(bundle, /\.\.\/src\/index\.js/);
    assert.match(bundle, /IGS version: 0\.3\.13/);
    assert.match(bundle, /resolveSegmentImageIndex/);
    assert.match(bundle, /message-scope-not-found/);
});

test('gate:dist-bundle:loads-as-esm-entry', async () => {
    const bundleUrl = `${pathToFileURL(path.join(appRoot, 'dist', 'igs.bundle.js')).href}?gate=${Date.now()}`;
    globalThis.IGS_AUTO_BOOTSTRAP = false;
    try {
        const bundle = await import(bundleUrl);
        assert.equal(typeof bundle.bootstrapIGS, 'function');
        assert.equal(typeof bundle.createVisualNovelReaderHost, 'function');
    } finally {
        delete globalThis.IGS_AUTO_BOOTSTRAP;
    }
});

test('gate:loader-json:repeated enable rescans magic wand without alerting', () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const documentLike = createLoaderDocumentLike();
    const alerts = [];
    let ensureCalls = 0;
    const root = {
        document: documentLike,
        alert: (message) => alerts.push(message),
        console,
        setTimeout: (callback) => {
            callback();
            return 1;
        },
        IGS: {
            ensureMagicWandEntry() {
                ensureCalls += 1;
                return { ok: true, entries: 1 };
            },
        },
    };
    root.parent = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout: root.setTimeout,
    });

    vm.runInContext(loaderJson.content, context);

    assert.equal(alerts.length, 0);
    assert.ok(ensureCalls >= 1);
    assert.equal(documentLike.head.children.length, 0);
    assert.equal(root.__IGS_AUTO_UPDATE_LOADER__.status, 'ready');
    assert.equal(root.__IGS_AUTO_UPDATE_LOADER__.reused, true);
});

test('gate:loader-json:adds-temporary-magic-wand-entry-before-remote-bundle-loads', () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const documentLike = createLoaderDocumentLike({ magicMenu: true });
    const alerts = [];
    const root = {
        document: documentLike,
        parent: null,
        alert: (message) => alerts.push(message),
        console,
        setTimeout: (callback) => {
            callback();
            return 1;
        },
        fetch: async () => ({ ok: true, status: 200 }),
    };
    root.parent = root;
    root.top = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout: root.setTimeout,
        fetch: root.fetch,
    });
    vm.runInContext(loaderJson.content, context);

    const entry = documentLike.magicMenu.querySelector('[data-vnm-loader-entry="1"]');
    assert.ok(entry);
    assert.equal(entry.getAttribute('data-vnm-magic-entry'), '1');
    assert.equal(entry.getAttribute('data-vnm-version'), 'loader');
    assert.match(entry.innerHTML, /沉浸式 Galgame 系统/);
    assert.deepEqual(alerts, []);
});

test('gate:loader-json:loads-main-commit-by-default-with-main-fallback', async () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const scripts = [];
    const alerts = [];
    const fetched = [];
    const documentLike = createLoaderDocumentLike({
        onAppend(element) {
            if (element.tagName !== 'SCRIPT') return;
            scripts.push(element.src);
            setTimeout(() => element.onload(), 0);
        },
    });
    const root = {
        document: documentLike,
        parent: null,
        alert: (message) => alerts.push(message),
        console,
        setTimeout,
        fetch: async (url, options = {}) => {
            const text = String(url);
            fetched.push(text);
            if (text.includes('/branches/main')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ commit: { sha: '1234567890abcdef1234567890abcdef12345678' } }),
                };
            }
            return { ok: true, status: 200 };
        },
    };
    root.parent = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout,
        fetch: root.fetch,
    });
    vm.runInContext(loaderJson.content, context);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.deepEqual(alerts, []);
    assert.equal(scripts.length, 1);
    assert.match(scripts[0], /@1234567890abcdef1234567890abcdef12345678\/app\/dist\/igs\.bundle\.js/);
    assert.ok(fetched.some((url) => url.includes('/branches/main')));
    assert.ok(fetched.some((url) => url.includes('@1234567890abcdef1234567890abcdef12345678/app/dist/igs.bundle.js')));
});

test('gate:loader-json:explicit-fixed-ref-falls-back-to-main-when-cdn-is-missing', async () => {
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));
    const scripts = [];
    const alerts = [];
    const fetched = [];
    const documentLike = createLoaderDocumentLike({
        onAppend(element) {
            if (element.tagName !== 'SCRIPT') return;
            scripts.push(element.src);
            setTimeout(() => element.onload(), 0);
        },
    });
    const root = {
        document: documentLike,
        parent: null,
        IGS_LOADER_REF: 'v9.9.9',
        alert: (message) => alerts.push(message),
        console,
        setTimeout,
        fetch: async (url) => {
            const text = String(url);
            fetched.push(text);
            return {
                ok: !text.includes('@v9.9.9/'),
                status: text.includes('@v9.9.9/') ? 404 : 200,
            };
        },
    };
    root.parent = root;

    const context = vm.createContext({
        window: root,
        document: documentLike,
        console,
        setTimeout,
        fetch: root.fetch,
    });
    vm.runInContext(loaderJson.content, context);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assert.deepEqual(alerts, []);
    assert.ok(fetched.some((url) => url.includes('@v9.9.9/app/dist/igs.bundle.js')));
    assert.equal(scripts.length, 1);
    assert.match(scripts[0], /@main\/app\/dist\/igs\.bundle\.js/);
});

test('gate:visual-novel-compat:legacy-storage', () => {
    const fixture = readJson('fixtures/visual-novel/legacy-storage.json');
    const storageLike = {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(fixture, key) ? fixture[key] : null;
        },
    };

    const result = readLegacyVisualNovelSettings(storageLike, 'mobile');
    assert.equal(result.ok, true);
    assert.equal(result.readerMode, 'mobile');
    assert.equal(result.displayMode, 'pc');
    assert.equal(result.bridge.showToasts, true);
    assert.equal(result.readerSettingsByMode.pc.toolbarDirection, 'horizontal');
    assert.equal(result.readerSettingsByMode.mobile.toolbarDirection, 'vertical');

    const invalidResult = readLegacyVisualNovelSettings({
        getItem(key) {
            if (key === 'vnm_visual_novel_bridge_config') return '{bad json';
            return null;
        },
    });
    assert.equal(invalidResult.ok, false);
    assert.equal(invalidResult.reason, 'invalid-legacy-json');
});

test('gate:visual-novel-compat:api-shape', async () => {
    const contract = readJson('fixtures/visual-novel/api-contract.json');
    const legacyStorage = readJson('fixtures/visual-novel/legacy-storage.json');
    const globalObject = {
        localStorage: {
            getItem(key) {
                return Object.prototype.hasOwnProperty.call(legacyStorage, key) ? legacyStorage[key] : null;
            },
        },
    };
    const igs = bootstrapIGS({
        global: globalObject,
        hostAdapter: {
            getCurrentMessage: async () => null,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    for (const method of contract.methods) {
        assert.equal(typeof igs[method], 'function');
    }

    const unifiedSettings = igs.getUnifiedSettings({ mode: 'pc' });
    for (const field of contract.unifiedSettingsFields) {
        assert.ok(Object.prototype.hasOwnProperty.call(unifiedSettings, field));
    }
    assert.equal(unifiedSettings.readerMode, 'pc');
    assert.equal(unifiedSettings.bridge.imageApi.mode, 'nai');
    try {
        const settingsResult = igs.openSettings({ tab: 'basic' });
        assert.equal(settingsResult.ok, true);
        assert.equal(settingsResult.snapshot.tabs.length, 4);
        assert.equal(settingsResult.snapshot.tabs[0].label, '基础');
        const generated = await igs.generateImage({ prompt: 'moon' });
        assert.equal(generated.ok, false);
        assert.equal(generated.reason, '请先在设置中填写图像 API 地址');
    } finally {
        igs.destroy();
    }
});

test('gate:visual-novel-ui:reader-source-keeps-original-selectors', () => {
    const fixture = readJson('fixtures/visual-novel-ui/original-reader-snapshot.json');
    const source = getOriginalReaderSource('0.3.13');

    for (const selector of fixture.requiredSelectors) {
        assert.ok(source.selectors.includes(selector));
        if (selector !== '#vnm-overlay') {
            assert.match(source.html, new RegExp(selectorToken(selector)));
        }
    }

    assert.equal(source.styleContract.overlayZIndex, fixture.styles['#vnm-overlay'].zIndex);
    assert.equal(source.styleContract.dialogWidth, fixture.styles['.vnm-dialog'].width);
    assert.equal(source.styleContract.inputHeight, fixture.styles['.vnm-input'].height);
    assert.equal(source.styleContract.sendButtonMinWidth, fixture.styles['.vnm-send-btn'].minWidth);
    assert.equal(source.styleContract.toolbarButtonSize, fixture.styles['.vnm-icon-btn'].width);
    assert.match(source.html, /data-act="toggle-bar"/);
    assert.match(source.html, /data-act="close"/);
    assert.match(source.html, /viewBox="0 0 24 24"/);
    assert.match(source.styleText, /#vnm-overlay\.vnm-floating\.is-dragging #vnm-click-layer\{cursor:grabbing;\}/);
    assert.match(source.styleText, /#vnm-overlay\.vnm-floating #vnm-click-layer\{cursor:grab;touch-action:none;\}/);
    assert.match(source.styleText, /#vnm-overlay\.vnm-floating \.vnm-progress\{flex-shrink:0;\}/);
    assert.match(source.styleText, /#vnm-overlay\.vnm-floating \.vnm-text\{min-height:0;overflow-y:auto;margin-bottom:12px;flex:1 1 auto;\}/);
    assert.match(source.styleText, /#vnm-overlay\.vnm-floating \.vnm-controls\{flex-shrink:0;\}/);
    assert.doesNotMatch(source.html, />‹</);
    assert.doesNotMatch(source.html, />⚙</);
});

test('gate:visual-novel-ui:settings-shell-keeps-original-tabs', () => {
    const fixture = readJson('fixtures/visual-novel-ui/settings-panel-snapshot.json');
    const shell = getSettingsShellTemplate();

    assert.match(shell, /vnm-settings-shell/);
    assert.match(shell, /vnm-settings-tabs/);
    assert.match(shell, /vnm-settings-body/);

    for (const tab of fixture.tabs) {
        const defined = SETTINGS_TAB_DEFS.find(([id]) => id === tab.id);
        assert.ok(defined);
        assert.equal(defined[1], tab.label);
        assert.ok(getSettingsTabTemplate(tab.id).length > 0);
    }
});

test('gate:visual-novel-ui:settings-style-keeps-original-geometry', () => {
    const fixture = readJson('fixtures/visual-novel-ui/settings-panel-snapshot.json');
    const styleText = getSettingsStyleText();

    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.viewportLeft)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.viewportTop)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.viewportWidth)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.viewportHeight)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.shellWidth)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.headerHeight)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.segmentedHeight)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.switchHeight)));
    assert.match(styleText, new RegExp(escapeRegExp(fixture.styleChecks.mobileMedia)));
    assert.match(styleText, /\.vnm-segmented-btn\{[^}]*min-width:0;[^}]*overflow:hidden/);
    assert.match(styleText, /\.vnm-segmented-btn-label\{[^}]*display:block;[^}]*max-width:100%;[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;[^}]*white-space:nowrap/);
});

test('gate:api:public-api-exposes-text-preset-groups', () => {
    const igs = bootstrapIGS({
        global: {},
        hostAdapter: {
            getCurrentMessage: async () => null,
            typeAndSend: async () => ({ ok: true }),
        },
    });

    assert.equal(typeof igs.api.textFilterPresets.register, 'function');
    assert.equal(typeof igs.api.textFormatPresets.register, 'function');
    assert.equal(typeof igs.api.sceneRegexPresets.register, 'function');
    assert.equal(typeof igs.api.textFilterPresets.setCurrent, 'function');
    assert.equal(typeof igs.api.textFormatPresets.getCurrent, 'function');
    assert.equal(typeof igs.api.sceneRegexPresets.exportAll, 'function');

    igs.destroy();
});

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

function createLoaderDocumentLike(options = {}) {
    const magicMenu = options.magicMenu ? createLoaderElement('div') : null;
    if (magicMenu) magicMenu.id = 'extensionsMenu';
    const head = {
        children: [],
        appendChild(element) {
            this.children.push(element);
            if (typeof options.onAppend === 'function') options.onAppend(element);
            return element;
        },
    };
    return {
        head,
        body: createLoaderElement('body'),
        magicMenu,
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            const normalized = String(selector || '');
            if (normalized === '#extensionsMenu') return magicMenu && !magicMenu.removed ? [magicMenu] : [];
            const idMatch = normalized.match(/^#(.+)$/);
            if (!idMatch) return [];
            const headMatch = head.children.find((element) => element.id === idMatch[1] && !element.removed);
            return headMatch ? [headMatch] : [];
        },
        createElement(tagName) {
            return createLoaderElement(tagName);
        },
    };
}

function createLoaderElement(tagName) {
    const attributes = new Map();
    return {
        tagName: String(tagName || '').toUpperCase(),
        children: [],
        parentNode: null,
        innerHTML: '',
        className: '',
        href: '',
        set id(value) {
            this._id = value;
            attributes.set('id', String(value));
        },
        get id() {
            return this._id;
        },
        setAttribute(name, value) {
            attributes.set(String(name), String(value));
            if (name === 'id') this._id = String(value);
        },
        getAttribute(name) {
            return attributes.has(String(name)) ? attributes.get(String(name)) : null;
        },
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        addEventListener() {},
        removeEventListener() {},
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            const normalized = String(selector || '');
            const dataMatch = normalized.match(/^\[([^=]+)="([^"]+)"\]$/);
            if (!dataMatch) return [];
            return this.children.filter((child) => child.getAttribute && child.getAttribute(dataMatch[1]) === dataMatch[2] && !child.removed);
        },
        remove() {
            this.removed = true;
        },
    };
}

function selectorToken(selector) {
    if (selector.startsWith('#')) {
        return `id="${selector.slice(1)}"`;
    }
    if (selector.startsWith('.')) {
        return selector.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
