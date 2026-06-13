import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createInputChannel } from '../src/host/input-channel.js';
import { createPresetRegistry } from '../src/presets/preset-registry.js';
import {
    buildVisualNovelTextPayload,
    cleanNarrativeSource,
    DEFAULT_VIRTUAL_REGEX,
} from '../src/scene/message-source.js';
import { parseSceneText } from '../src/scene/text-parser.js';
import { runTextPipeline } from '../src/scene/text-pipeline.js';
import { createMemoryStorage } from '../src/storage/preset-store.js';
import { resolveScene } from '../src/scene/scene-resolver.js';
import { getResponsiveLayout } from '../src/visual/responsive-layout.js';
import { createReaderState } from '../src/visual/reader-state.js';
import { createStageModel } from '../src/visual/stage-model.js';
import { resolveVisualMode, VISUAL_MODES } from '../src/visual/visual-mode.js';
import { createPromptAdapter } from '../src/prompts/adapters/prompt-adapter.js';
import { naiRequestBuilder } from '../src/generated-images/request-builders/nai-builder.js';
import { createPublicApi, attachPublicApi } from '../src/api/public-api.js';
import { createVisualNovelReaderHost } from '../src/visual/visual-novel-ui/reader-host.js';

const appRoot = path.resolve(import.meta.dirname, '..');

test('gate:host:input-channel rejects empty text and sends valid text', async () => {
    const sent = [];
    const channel = createInputChannel({
        typeAndSend: async (text) => {
            sent.push(text);
            return { ok: true };
        },
    });

    assert.equal((await channel.typeAndSend('')).ok, false);
    assert.deepEqual(await channel.typeAndSend('继续'), { ok: true });
    assert.deepEqual(sent, ['继续']);
});

test('gate:scene:parses tags and resolves background and character rules', () => {
    const textScene = parseSceneText('[角色: 艾莉]\n[情绪: 微笑]\n[时间: 夜晚]\n[天气: 雨]\n[地点: 图书馆]\n我们到了。', { messageId: 1 });
    const scene = resolveScene({
        textScene,
        backgroundRules: [
            { id: 'bg.library', priority: 10, match: { location: ['图书馆'], time: ['夜晚'], weather: ['雨'] } },
        ],
        characterRules: [
            { id: 'char.eli.smile', character: '艾莉', emotion: '微笑' },
        ],
    });

    assert.equal(scene.messageId, 1);
    assert.equal(scene.speaker, '艾莉');
    assert.equal(scene.background.id, 'bg.library');
    assert.equal(scene.character.id, 'char.eli.smile');
});

test('gate:presets:registry-registers-and-lists-text-presets', () => {
    const bundle = readJson('fixtures/presets/text-presets-import-bundle.json');
    const registry = createPresetRegistry();
    const result = registry.importBundle(bundle);

    assert.equal(result.ok, true);
    assert.equal(result.accepted.length, 3);
    assert.equal(registry.list('text-filter-preset').length, 1);
    assert.equal(registry.list('text-format-preset').length, 1);
    assert.equal(registry.list('scene-regex-preset').length, 1);
    assert.equal(registry.get('text-format-preset', 'preset.text-format.bubble-line').name, 'Bubble 转对话行');
});

test('gate:presets:registry-current-survives-storage-reload', () => {
    const bundle = readJson('fixtures/presets/text-presets-import-bundle.json');
    const storage = createMemoryStorage();
    const registry = createPresetRegistry({ storage });

    registry.importBundle(bundle);
    registry.setCurrent('text-filter-preset', 'preset.text-filter.content-only');
    registry.setCurrent('text-format-preset', 'preset.text-format.bubble-line');
    registry.setCurrent('scene-regex-preset', 'preset.scene-regex.stage-fields');

    const reloaded = createPresetRegistry({ storage });
    assert.equal(reloaded.snapshot().current['text-filter-preset'], 'preset.text-filter.content-only');
    assert.equal(reloaded.snapshot().current['text-format-preset'], 'preset.text-format.bubble-line');
    assert.equal(reloaded.snapshot().current['scene-regex-preset'], 'preset.scene-regex.stage-fields');
    assert.equal(reloaded.getCurrent('text-format-preset').name, 'Bubble 转对话行');
});

test('gate:presets:bad-preset-does-not-overwrite-current', () => {
    const bundle = readJson('fixtures/presets/text-presets-import-bundle.json');
    const badBundle = readJson('fixtures/presets/bad-current-overwrite-bundle.json');
    const registry = createPresetRegistry();

    registry.importBundle(bundle);
    registry.setCurrent('text-format-preset', 'preset.text-format.bubble-line');
    const before = registry.getCurrent('text-format-preset');
    const result = registry.importBundle(badBundle);
    const after = registry.getCurrent('text-format-preset');

    assert.equal(result.ok, false);
    assert.equal(result.rejected.length, 1);
    assert.equal(before.id, after.id);
    assert.equal(after.data.pattern, '@bubble:([^|\\n]+)\\|([^|\\n]+)\\|([^\\n]+)');
});

test('gate:presets:export-group-keeps-igs-bundle-shape', () => {
    const bundle = readJson('fixtures/presets/text-presets-import-bundle.json');
    const registry = createPresetRegistry();

    registry.importBundle(bundle);
    const exported = registry.exportGroup('text-format-preset');

    assert.equal(exported.type, 'igs-import-bundle');
    assert.equal(exported.items.length, 1);
    assert.equal(exported.items[0].type, 'text-format-preset');
});

test('gate:scene:text-filter-preset:extracts-content', () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const textFilterPreset = readJson('fixtures/text/text-filter-preset.json');
    const scene = parseSceneText(message.text, {
        messageId: message.id,
        textFilterPreset,
    });

    assert.equal(scene.messageId, 12);
    assert.equal(scene.text.includes('不要进入正文'), false);
    assert.equal(scene.text.includes('prompt://ignore-me'), false);
    assert.equal(scene.text.includes('@bubble:玉子|开心|你好，欢迎来到图书馆。'), true);
    assert.equal(scene.sourceKind, 'tagged-content');
    assert.deepEqual(scene.textPipelineErrors, []);
});

test('gate:scene:text-format-preset:applies-replacement', () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const textFilterPreset = readJson('fixtures/text/text-filter-preset.json');
    const textFormatPreset = readJson('fixtures/text/text-format-preset.json');
    const pipeline = runTextPipeline(message.text, {
        textFilterPreset,
        textFormatPreset,
    });

    assert.equal(pipeline.ok, true);
    assert.match(pipeline.formattedText, /玉子（开心）：你好，欢迎来到图书馆。/);
    assert.equal(pipeline.formatSourceKind, 'regex-replace');
});

test('gate:scene:scene-regex-preset:extracts-fields', () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const textFilterPreset = readJson('fixtures/text/text-filter-preset.json');
    const textFormatPreset = readJson('fixtures/text/text-format-preset.json');
    const sceneRegexPreset = readJson('fixtures/text/scene-regex-preset.json');
    const pipeline = runTextPipeline(message.text, {
        textFilterPreset,
        textFormatPreset,
        sceneRegexPreset,
    });

    assert.equal(pipeline.ok, true);
    assert.equal(pipeline.scenePatch.location, '图书馆');
    assert.equal(pipeline.scenePatch.time, '夜晚');
    assert.equal(pipeline.scenePatch.weather, '雨');
    assert.equal(pipeline.scenePatch.speaker, '玉子');
    assert.equal(pipeline.scenePatch.emotion, '开心');
});

test('gate:scene:text-pipeline:bad-regex-does-not-throw', () => {
    const message = readJson('fixtures/text/tagged-content-message.json');
    const textFilterPreset = readJson('fixtures/text/text-filter-preset.json');
    const badTextFormatPreset = readJson('fixtures/text/bad-text-format-preset.json');

    const scene = parseSceneText(message.text, {
        messageId: message.id,
        textFilterPreset,
        textFormatPreset: badTextFormatPreset,
    });

    assert.equal(scene.messageId, 12);
    assert.match(scene.text, /@bubble:玉子\|开心\|你好，欢迎来到图书馆。/);
    assert.equal(scene.textPipelineErrors.length > 0, true);
    assert.equal(scene.textPipelineErrors[0].presetType, 'text-format-preset');
});

test('gate:scene:visual-novel-message-source:extracts-readable-text-from-host-ui-html', () => {
    const message = readJson('fixtures/tavern/host-ui-leak-message.json');
    const payload = buildVisualNovelTextPayload(message);

    assert.equal(payload.formattedText.includes('API Connections'), false);
    assert.equal(payload.formattedText.includes('rightNavHolder'), false);
    assert.equal(payload.formattedText.includes('<div'), false);
    assert.equal(payload.formattedText.includes('<button'), false);
    assert.match(payload.formattedText, /玉子: 今晚我们先从这里开始。/);
    assert.equal(payload.usedFallback, true);
});

test('gate:scene:visual-novel-message-source:formats-default-bubble-body', () => {
    const payload = buildVisualNovelTextPayload({
        text: '<content>@bubble:玉子|开心|[欢迎来到图书馆。]</content>',
    }, {
        virtualRegex: DEFAULT_VIRTUAL_REGEX,
    });

    assert.equal(payload.formattedText, '[玉子]：欢迎来到图书馆。');
    assert.equal(payload.virtualRegexChanged, true);
});

test('gate:visual-novel-ui:reader-host-skips-empty-scene-text-and-falls-back-to-readable-text', () => {
    const host = createVisualNovelReaderHost({
        global: {},
        getUnifiedSettings: () => ({
            version: '0.3.2',
            bridge: { openMode: 'pc', showToasts: true },
            readerMode: 'pc',
            readerSettings: {},
        }),
        saveUnifiedSettings: () => ({ ok: true, legacy: {}, unified: {} }),
    });

    const opened = host.openReader({
        messageId: 99,
        scene: {
            speaker: '艾莉',
            text: '',
        },
        formattedText: '可读正文',
    }, { mode: 'pc' });

    assert.equal(opened.ok, true);
    assert.equal(opened.snapshot.content.text, '可读正文');
    assert.equal(opened.snapshot.content.displayText, '艾莉: 可读正文');
    host.destroy();
});

test('gate:scene:visual-novel-message-source:clean-narrative-source-strips-host-ui-tags', () => {
    const cleaned = cleanNarrativeSource(readJson('fixtures/tavern/host-ui-leak-message.json').text);

    assert.equal(cleaned.includes('<div'), false);
    assert.equal(cleaned.includes('<button'), false);
    assert.equal(cleaned.includes('API Connections'), true);
});

test('gate:visual:generated image scene selects generated-first mode', () => {
    const mode = resolveVisualMode({ generatedImage: { value: 'placeholder://image' } });
    assert.equal(mode, VISUAL_MODES.GENERATED_FIRST);
});

test('gate:visual-reader-state:normalizes-settings', () => {
    const fixture = {
        mode: 'web',
        isMobile: true,
        viewport: { width: 844, height: 390 },
        readerSettings: {
            fontSize: 15,
            toolbarPlacement: 'bottom-right',
            toolbarDirection: 'auto',
            showAvatar: true,
        },
    };

    const state = createReaderState(fixture);
    assert.equal(state.layout, 'mobile-landscape');
    assert.equal(state.toolbarLayout, 'vertical');
    assert.equal(state.toolbarPlacement, 'bottom-right');
    assert.equal(state.avatarVisible, true);
    assert.equal(state.cssVars['--igs-dialogue-font-size'], '15px');
    assert.equal(state.attributes['data-igs-dialogue-style'], 'panel');
});

test('gate:visual-responsive-layout:desktop-portrait-landscape', () => {
    assert.equal(getResponsiveLayout({ width: 1280, height: 720 }, { mode: 'pc' }), 'desktop');
    assert.equal(getResponsiveLayout({ width: 390, height: 844 }, { mode: 'web', isMobile: true }), 'mobile-portrait');
    assert.equal(getResponsiveLayout({ width: 844, height: 390 }, { mode: 'fullscreen', isMobile: true }), 'mobile-landscape');
});

test('gate:visual-stage-model:exposes-stable-stage-shape', () => {
    const readerState = createReaderState({
        mode: 'pc',
        viewport: { width: 1280, height: 720 },
        readerSettings: { fontSize: 18, toolbarDirection: 'horizontal' },
    });
    const stage = createStageModel({
        speaker: '艾莉',
        text: '我们到了。',
        background: { id: 'bg.library' },
        character: { id: 'char.eli.smile' },
        visualMode: 'background-character',
    }, readerState);

    assert.equal(stage.type, 'igs-stage-model');
    assert.equal(stage.layers.background.visible, true);
    assert.equal(stage.layers.generated.visible, false);
    assert.equal(stage.layers.dialogue.text, '我们到了。');
    assert.equal(stage.layers.hud.toolbar.layout, 'horizontal');
});

test('gate:prompts:nai request builder renders prompt context', () => {
    const adapter = createPromptAdapter({ nai: naiRequestBuilder });
    const context = adapter.createPromptContext({ speaker: '艾莉', location: '图书馆' });
    const result = adapter.buildRequest(
        'nai',
        context,
        { data: { prompt: '{{speaker}} in {{location}}', negativePrompt: 'low quality' } },
        { data: { model: 'nai-diffusion-test' } },
    );

    assert.equal(result.ok, true);
    assert.equal(result.request.prompt, '艾莉 in 图书馆');
    assert.equal(result.request.model, 'nai-diffusion-test');
});

test('gate:api:public api attaches stable global aliases', async () => {
    const globalObject = {};
    const api = createPublicApi({
        version: '0.3.2',
        refresh: async () => ({ ok: true }),
        typeAndSend: async () => ({ ok: true }),
        getState: () => ({ config: { mode: 'test' } }),
        destroy: () => ({ ok: true }),
    });

    attachPublicApi(globalObject, api);
    assert.equal(globalObject.IGS, api);
    assert.equal(globalObject.ImmersiveGalgameSystem, api);
    assert.equal(api.api.imageProviders.register({ id: 'provider.fake' }).ok, true);
    assert.equal(api.api.imageProviders.list().length, 1);
    assert.equal(api.api.textFilterPresets.register(readJson('fixtures/text/text-filter-preset.json')).ok, true);
    assert.equal(typeof api.api.textFilterPresets.setCurrent, 'function');
    assert.equal(api.api.textFilterPresets.setCurrent('preset.text-filter.content-only').ok, true);
    assert.equal(api.api.textFilterPresets.getCurrent().id, 'preset.text-filter.content-only');
    assert.equal(api.api.textFilterPresets.exportAll().type, 'igs-import-bundle');
    assert.equal(api.ensureMagicWandEntry().reason, 'magic-wand-entry-not-mounted');
});

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}
