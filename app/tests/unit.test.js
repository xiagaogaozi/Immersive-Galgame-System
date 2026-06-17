import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createInputChannel } from '../src/host/input-channel.js';
import { createPresetRegistry } from '../src/presets/preset-registry.js';
import {
    buildIgsTextPayload,
    cleanNarrativeSource,
    DEFAULT_SOURCE_FILTER,
    DEFAULT_VIRTUAL_REGEX,
} from '../src/scene/message-source.js';
import {
    buildSegmentImageMap,
    parseImageSlots,
} from '../src/scene/image-slots.js';
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
import { chamiProvider } from '../src/generated-images/providers/chami-provider.js';
import { fetchModels as fetchImageModels, generateImage as generateImageFromApi } from '../src/generated-images/image-api-client.js';
import { createReaderImageService } from '../src/generated-images/reader-image-service.js';
import { createPublicApi, attachPublicApi } from '../src/api/public-api.js';
import {
    createTavernHelperAdapter,
    ensureMessageImagePlaceholders,
} from '../src/host/tavern-helper-adapter.js';
import { createIgsReaderHost } from '../src/visual/igs-ui/reader-host.js';
import { createPromptInjector } from '../src/host/prompt-injector.js';
import {
    extractSceneDirectives,
    lookupSceneAssetUrls,
    resolveSceneStateAtIndex,
} from '../src/scene/scene-directives.js';

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

test('gate:scene:igs-message-source:extracts-readable-text-from-host-ui-html', () => {
    const message = readJson('fixtures/tavern/host-ui-leak-message.json');
    const payload = buildIgsTextPayload(message);

    assert.equal(payload.formattedText.includes('API Connections'), false);
    assert.equal(payload.formattedText.includes('rightNavHolder'), false);
    assert.equal(payload.formattedText.includes('<div'), false);
    assert.equal(payload.formattedText.includes('<button'), false);
    assert.match(payload.formattedText, /玉子: 今晚我们先从这里开始。/);
    assert.equal(payload.usedFallback, true);
});

test('gate:scene:igs-message-source:reader-segments-skip-scene-tags', () => {
    const payload = buildIgsTextPayload({
        text: '[角色: 艾莉]\n艾莉: 第一句。 第二句。',
    });

    assert.deepEqual(payload.textSegments, ['第一句。 第二句。']);
    assert.deepEqual(payload.segmentImageSlots, []);
});

test('gate:scene:image-slots:parses-image-tags-in-order', () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const slots = parseImageSlots(source, source, DEFAULT_SOURCE_FILTER);

    assert.equal(slots.length, 6);
    assert.deepEqual(slots.map((slot) => slot.title), [
        '望月的抗拒背影',
        '海斗的冷静观察',
        '望月的不甘与动摇',
        '致命的诱惑：海斗的笔记',
        '海斗的离去与望月的注视',
        '海斗的笔记本与指尖',
    ]);
    assert.deepEqual(slots.map((slot) => slot.promptText), [
        'image###slot-1###',
        'image###slot-2###',
        'image###slot-3###',
        'image###slot-4###',
        'image###slot-5###',
        'image###slot-6###',
    ]);
});

test('gate:scene:image-slots:maps-reader-segments-to-slot-indexes', () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const payload = buildIgsTextPayload({ text: source }, {
        sourceFilter: DEFAULT_SOURCE_FILTER,
    });
    const mapped = buildSegmentImageMap(source, payload.textSegments, payload.imageSlots);

    assert.deepEqual(payload.textSegments, ['第一段正文。', '第二段正文。', '第三段正文。']);
    assert.deepEqual(mapped, [0, 1, 2]);
    assert.deepEqual(payload.segmentImageSlots, [0, 1, 2]);
});

test('gate:scene:igs-message-source:formats-default-bubble-body', () => {
    const payload = buildIgsTextPayload({
        text: '<content>@bubble:玉子|开心|[欢迎来到图书馆。]</content>',
    }, {
        virtualRegex: DEFAULT_VIRTUAL_REGEX,
    });

    assert.equal(payload.formattedText, '[玉子]：欢迎来到图书馆。');
    assert.equal(payload.virtualRegexChanged, true);
});

test('gate:host:prompt-injector-registers-scene-rule-as-in-prompt-extension-prompt', () => {
    const extensionPrompts = {};
    const calls = [];
    const globalObject = {
        TavernHelper: {
            injectPrompts() {
                throw new Error('TavernHelper fallback should not be used when SillyTavern context exists');
            },
        },
        SillyTavern: {
            getContext() {
                return {
                    extensionPrompts,
                    setExtensionPrompt(key, value, position, depth, scan, role) {
                        calls.push({ key, value, position, depth, scan, role });
                        extensionPrompts[key] = { value, position, depth, scan, role };
                    },
                };
            },
        },
    };
    const injector = createPromptInjector(globalObject);
    const result = injector.inject('rule: @igs-scene');

    assert.deepEqual(result, { ok: true, method: 'extension-prompt', verified: true });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].position, 0);
    assert.equal(calls[0].role, 0);
    assert.equal(extensionPrompts['igs-scene-assets-format-rule'].value, 'rule: @igs-scene');
    assert.equal(extensionPrompts['igs-scene-assets-format-rule'].position, 0);
    assert.equal(injector.isActive(), true);

    injector.clear();
    assert.equal(Object.hasOwn(extensionPrompts, 'igs-scene-assets-format-rule'), false);
    assert.equal(injector.isActive(), false);
});

test('gate:scene:scene-assets-falls-back-to-single-configured-background-and-mood', () => {
    const assets = lookupSceneAssetUrls({
        scene: 'B班教室',
        character: '小林海斗',
        mood: '平静',
    }, {
        scenes: {
            '场景1': 'https://example.com/classroom.png',
        },
        characters: {
            '小林海斗': {
                '随和': 'https://example.com/kaito.png',
            },
        },
    });

    assert.deepEqual(assets, {
        backgroundUrl: 'https://example.com/classroom.png',
        spriteUrl: 'https://example.com/kaito.png',
    });
});

test('gate:scene:scene-assets-state-follows-current-reader-segment', () => {
    const { directives } = extractSceneDirectives([
        'Opening narration.',
        '[igs-scene:Room|morning|sunny]',
        '[igs-char:Alice|calm|Hello.]',
        'Alice keeps working.',
        '[igs-char:Bob|annoyed|Move faster.]',
        'Bob leaves later.',
    ].join('\n'));

    // directive lines don't count toward segmentIndex — only non-directive lines do
    assert.deepEqual(directives.map((d) => d.segmentIndex), [1, 1, 2]);
    const empty = { scene: '', time: '', weather: '', character: '', mood: '', dialogue: '', thought: '' };
    assert.deepEqual(resolveSceneStateAtIndex(directives, 0), empty);
    assert.deepEqual(resolveSceneStateAtIndex(directives, 1), { scene: 'Room', time: 'morning', weather: 'sunny', character: 'Alice', mood: 'calm', dialogue: 'Hello.', thought: '' });
    assert.deepEqual(resolveSceneStateAtIndex(directives, 2), { scene: 'Room', time: 'morning', weather: 'sunny', character: 'Bob', mood: 'annoyed', dialogue: 'Move faster.', thought: '' });
});

test('gate:igs-ui:scene-assets-keeps-sprite-with-existing-background', () => {
    const host = createIgsReaderHost({
        global: {},
        getUnifiedSettings: () => ({
            version: '0.4.9',
            bridge: {
                openMode: 'pc',
                sceneAssets: {
                    enabled: true,
                    scenes: {
                        Room: 'https://example.com/room.png',
                    },
                    characters: {
                        Kaito: {
                            calm: 'https://example.com/kaito.png',
                        },
                    },
                },
            },
            readerMode: 'pc',
            readerSettings: {},
        }),
        saveUnifiedSettings: () => ({ ok: true, legacy: {}, unified: {} }),
    });

    const opened = host.openReader({
        message: {
            text: '[igs-scene:Room|morning|sunny]\n[igs-char:Kaito|calm|Ready.]\nKaito keeps working.',
        },
        render: {
            stage: {
                layers: {
                    background: {
                        resource: {
                            url: 'https://example.com/generated-background.png',
                        },
                    },
                },
            },
        },
    }, { mode: 'pc' });

    assert.equal(opened.snapshot.content.backgroundImage, 'https://example.com/room.png');
    assert.equal(opened.snapshot.content.spriteImage, 'https://example.com/kaito.png');
    assert.match(opened.snapshot.html, /id="igs-sprite"/);
    assert.equal(opened.snapshot.styles['#igs-sprite'].display, 'block');

    host.destroy();
});

test('gate:scene:igs-message-source:extracts-scene-directives-from-fallback-text', () => {
    const payload = buildIgsTextPayload({
        text: '[igs-scene:B班教室|下午|晴天]\n[igs-char:小林海斗|平静|できるもん！]',
    }, {
        sceneAssets: { enabled: true },
    });

    assert.equal(payload.sceneDirectives.length, 2);
    assert.equal(payload.sceneDirectives[0].type, 'scene');
    assert.equal(payload.sceneDirectives[0].scene, 'B班教室');
    assert.equal(payload.sceneDirectives[1].type, 'char');
    assert.equal(payload.sceneDirectives[1].character, '小林海斗');
    assert.equal(payload.sceneDirectives[1].mood, '平静');
});

test('gate:igs-ui:reader-host-skips-empty-scene-text-and-falls-back-to-readable-text', () => {
    const host = createIgsReaderHost({
        global: {},
        getUnifiedSettings: () => ({
            version: '0.3.20',
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

test('gate:igs-ui:reader-host-keeps-one-line-multi-sentence-on-a-single-page', () => {
    const host = createIgsReaderHost({
        global: {},
        getUnifiedSettings: () => ({
            version: '0.3.20',
            bridge: { openMode: 'pc', showToasts: true },
            readerMode: 'pc',
            readerSettings: {},
        }),
        saveUnifiedSettings: () => ({ ok: true, legacy: {}, unified: {} }),
    });

    const opened = host.openReader({
        messageId: 100,
        scene: {
            speaker: '艾莉',
            text: '第一句。 第二句。',
        },
    }, { mode: 'pc' });

    assert.equal(opened.ok, true);
    assert.deepEqual(opened.snapshot.content.segments, ['第一句。 第二句。']);
    assert.equal(opened.snapshot.content.progress, '1 / 1');
    host.destroy();
});

test('gate:igs-ui:reader-host-splits-single-newline-paragraphs-into-multiple-pages', () => {
    const host = createIgsReaderHost({
        global: {},
        getUnifiedSettings: () => ({
            version: '0.3.20',
            bridge: { openMode: 'pc', showToasts: true },
            readerMode: 'pc',
            readerSettings: {},
        }),
        saveUnifiedSettings: () => ({ ok: true, legacy: {}, unified: {} }),
    });

    const opened = host.openReader({
        messageId: 101,
        scene: {
            speaker: '艾莉',
            text: '第一段。\n第二段。',
        },
    }, { mode: 'pc' });

    assert.equal(opened.ok, true);
    assert.deepEqual(opened.snapshot.content.segments, ['第一段。', '第二段。']);
    assert.equal(opened.snapshot.content.progress, '1 / 2');
    host.destroy();
});

test('gate:scene:igs-message-source:clean-narrative-source-strips-host-ui-tags', () => {
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
        version: '0.3.20',
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

test('gate:host:tavern-helper-adapter-detects-user-messages-from-role-flags-and-dom', async () => {
    const domUserMessage = {
        getAttribute(name) {
            if (name === 'is_user') return 'true';
            return null;
        },
    };
    const messages = [
        { id: 1, text: '玩家发言', role: 'user' },
        { id: 2, text: '玩家发言 2', is_user: 'true' },
        { id: 3, text: '玩家发言 3', element: domUserMessage },
        { id: 4, text: '旁白发言' },
    ];
    const adapter = createTavernHelperAdapter({
        TavernHelper: {
            getLastMessageId: () => 4,
            getChatMessages: () => messages,
        },
        document: {
            querySelectorAll: () => [],
        },
    });

    const normalized = await adapter.listMessages();

    assert.equal(normalized[0].isUser, true);
    assert.equal(normalized[1].isUser, true);
    assert.equal(normalized[2].isUser, true);
    assert.equal(normalized[3].isUser, false);
});

test('gate:generated-images:image-api-client-fetch-models-parses-nested-payload', async () => {
    const calls = [];
    const result = await fetchImageModels({
        endpoint: 'https://example.com/v1',
        apiKey: 'demo-token',
    }, {
        fetch: async (url, options = {}) => {
            calls.push({ url, options });
            return new Response(JSON.stringify({
                data: [
                    { id: 'nai-diffusion-3' },
                    { name: 'nai-diffusion-4-curated-preview' },
                ],
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        },
    });

    assert.equal(result.ok, true);
    assert.equal(result.count, 2);
    assert.deepEqual(result.models, ['nai-diffusion-3', 'nai-diffusion-4-curated-preview']);
    assert.equal(calls[0].url, 'https://example.com/v1/models');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer demo-token');
});

test('gate:generated-images:image-api-client-generates-and-polls-pending-task', async () => {
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Zq4cAAAAASUVORK5CYII=';
    const calls = [];
    const result = await generateImageFromApi({
        prompt: 'moon lake',
    }, {
        endpoint: 'https://example.com/v1',
        apiKey: 'demo-token',
        mode: 'nai',
        pollIntervalMs: 1,
        pollAttempts: 2,
    }, {
        fetch: async (url, options = {}) => {
            calls.push({ url, options });
            if (String(url).endsWith('/images/generations')) {
                return new Response(JSON.stringify({
                    status: 'pending',
                    status_url: '/tasks/1',
                }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                });
            }
            return new Response(JSON.stringify({
                data: [
                    { b64_json: base64Image },
                ],
            }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        },
        setTimeout(callback) {
            callback();
            return 1;
        },
        clearTimeout() {},
    });

    assert.ok(result.url.startsWith('data:image/png;base64,'));
    assert.equal(calls[0].url, 'https://example.com/v1/images/generations');
    assert.equal(calls[1].url, 'https://example.com/tasks/1');
});

test('gate:generated-images:image-api-client-parses-zip-image-response', async () => {
    const pngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8ffff3f0005fe02fea57d7fa60000000049454e44ae426082', 'hex');
    const zipBytes = buildStoredZip('scene.png', pngBytes);
    const result = await generateImageFromApi({
        prompt: 'zip image',
    }, {
        endpoint: 'https://example.com/v1',
        mode: 'nai',
    }, {
        fetch: async () => new Response(zipBytes, {
            status: 200,
            headers: { 'content-type': 'application/zip' },
        }),
    });

    assert.ok(result.url.startsWith('data:image/png;base64,'));
});

test('gate:generated-images:reader-image-service-prefers-slot-binding-over-scan-order', async () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const payload = buildIgsTextPayload({ text: source }, {
        sourceFilter: DEFAULT_SOURCE_FILTER,
    });
    const service = createReaderImageService({
        providers: [
            {
                id: 'test.slot-provider',
                async detect() {
                    return true;
                },
                extractImages() {
                    return [{
                        url: 'https://example.com/slot-3.png',
                        slotIndex: 2,
                    }];
                },
            },
        ],
    });

    const imageState = await service.collect({
        messageId: 77,
        message: { id: 77, text: source },
        imageSlots: payload.imageSlots,
        preferredImageIndex: 2,
    });

    assert.equal(imageState.ok, true);
    assert.equal(imageState.count, 6);
    assert.equal(imageState.currentIndex, 2);
    assert.equal(imageState.displayUrl, 'https://example.com/slot-3.png');
    assert.equal(imageState.slots[2].url, 'https://example.com/slot-3.png');
    assert.equal(imageState.slots.filter((slot) => slot.url).length, 1);
    assert.equal(imageState.unboundImages.length, 0);
});

test('gate:generated-images:reader-image-service-keeps-single-unnumbered-image-unbound-with-image-tags', async () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const payload = buildIgsTextPayload({ text: source }, {
        sourceFilter: DEFAULT_SOURCE_FILTER,
    });
    const service = createReaderImageService({
        providers: [
            {
                id: 'test.unnumbered-provider',
                async detect() {
                    return true;
                },
                extractImages() {
                    return [{
                        url: 'https://example.com/latest-visible-image.png',
                    }];
                },
            },
        ],
    });

    const imageState = await service.collect({
        messageId: 80,
        message: { id: 80, text: source },
        imageSlots: payload.imageSlots,
        preferredImageIndex: 0,
    });

    assert.equal(imageState.ok, true);
    assert.equal(imageState.count, 6);
    assert.equal(imageState.currentIndex, 0);
    assert.equal(imageState.currentUrl, '');
    assert.equal(imageState.displayUrl, '');
    assert.equal(imageState.boundCount, 0);
    assert.equal(imageState.unboundCount, 1);
    assert.equal(imageState.availableCount, 1);
    assert.equal(imageState.slots.filter((slot) => slot.url).length, 0);
    assert.equal(imageState.unboundImages[0].url, 'https://example.com/latest-visible-image.png');
});

test('gate:generated-images:reader-image-service-orders-multiple-unkeyed-provider-images-into-slots', async () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const payload = buildIgsTextPayload({ text: source }, {
        sourceFilter: DEFAULT_SOURCE_FILTER,
    });
    const service = createReaderImageService({
        providers: [
            {
                id: 'test.unkeyed-multi-provider',
                async detect() {
                    return true;
                },
                extractImages() {
                    return [
                        { url: 'https://example.com/chami-a.png', order: 1 },
                        { url: 'https://example.com/chami-b.png', order: 2 },
                    ];
                },
            },
        ],
    });

    const imageState = await service.collect({
        messageId: 81,
        message: { id: 81, text: source },
        imageSlots: payload.imageSlots,
        preferredImageIndex: 0,
    });

    assert.equal(imageState.ok, true);
    assert.equal(imageState.boundCount, 2);
    assert.equal(imageState.slots[0].url, 'https://example.com/chami-a.png');
    assert.equal(imageState.slots[1].url, 'https://example.com/chami-b.png');
    assert.equal(imageState.unboundCount, 0);
});

test('gate:generated-images:reader-image-service-does-not-show-later-slot-on-first-segment', async () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const payload = buildIgsTextPayload({ text: source }, {
        sourceFilter: DEFAULT_SOURCE_FILTER,
    });
    const service = createReaderImageService({
        providers: [
            {
                id: 'test.slot-provider',
                async detect() {
                    return true;
                },
                extractImages() {
                    return [{
                        url: 'https://example.com/slot-6.png',
                        slotIndex: 5,
                    }];
                },
            },
        ],
    });

    const imageState = await service.collect({
        messageId: 78,
        message: { id: 78, text: source },
        imageSlots: payload.imageSlots,
        preferredImageIndex: 0,
    });

    assert.equal(imageState.ok, true);
    assert.equal(imageState.count, 6);
    assert.equal(imageState.currentIndex, 0);
    assert.equal(imageState.currentUrl, '');
    assert.equal(imageState.displayUrl, '');
    assert.equal(imageState.slots[5].url, 'https://example.com/slot-6.png');
});

test('gate:generated-images:reader-image-service-keeps-global-generic-images-out-when-message-scope-is-required', async () => {
    const source = readText('fixtures/igs/image-slot-binding-message.txt');
    const payload = buildIgsTextPayload({ text: source }, {
        sourceFilter: DEFAULT_SOURCE_FILTER,
    });
    const leakedImage = createFakeImageNode('https://example.com/role-card.png');
    const globalDocument = {
        querySelectorAll(selector) {
            if (
                selector === '.mes_text img[src]'
                || selector === '.mes_text img[data-src]'
                || selector === 'img[src]'
                || selector === 'img[data-src]'
                || selector === 'img[src^="blob:"]'
                || selector === 'img[src^="data:image"]'
                || selector === 'video'
                || selector === 'a[href^="blob:"]'
                || selector === 'a[href^="data:image"]'
                || selector === '[style*="background-image"]'
            ) {
                return [leakedImage];
            }
            return [];
        },
    };
    const service = createReaderImageService({
        global: {
            document: globalDocument,
        },
    });

    const imageState = await service.collect({
        messageId: 79,
        message: { id: 79, text: source },
        imageSlots: payload.imageSlots,
        preferredImageIndex: 0,
    });

    assert.equal(imageState.ok, true);
    assert.equal(imageState.scopeKind, 'message');
    assert.equal(imageState.scopeOk, false);
    assert.equal(imageState.reason, 'message-scope-not-found');
    assert.equal(imageState.currentUrl, '');
    assert.equal(imageState.displayUrl, '');
    assert.equal(imageState.unboundImages.length, 0);
    assert.equal(imageState.diagnostics.providerCounts.generic, 0);
});

test('gate:host:ensure-message-image-placeholders-reuses-owned-placeholder', () => {
    const mesText = createTestMesTextRoot();
    const message = {
        element: {
            getAttribute() {
                return null;
            },
            querySelector(selector) {
                return selector === '.mes_text' ? mesText : null;
            },
        },
    };
    const slots = [
        { rawBlock: '<image>[图 1]\nimage###one###</image>' },
        { rawBlock: '<image>[图 2]\nimage###two###</image>' },
    ];

    const first = ensureMessageImagePlaceholders(message, slots);
    const second = ensureMessageImagePlaceholders(message, slots);

    assert.equal(first.ok, true);
    assert.equal(first.reason, 'placeholder-injected');
    assert.equal(second.ok, true);
    assert.equal(second.reason, 'placeholder-present');
    assert.equal(mesText.children.length, 2);
    assert.equal(mesText.children[0].getAttribute('data-igs-image-placeholder'), '1');
    assert.equal(mesText.children[0].getAttribute('data-igs-image-slot'), '0');
    assert.equal(mesText.children[1].getAttribute('data-igs-image-slot'), '1');
    assert.match(mesText.children[0].textContent, /image###one###/);
    assert.match(mesText.children[1].textContent, /image###two###/);
});

test('gate:host:tavern-helper-adapter-uses-hide-state-fallback-for-hidden-messages', async () => {
    const messages = [
        { id: 0, text: '玩家', role: 'user' },
        { id: 1, text: '隐藏楼层' },
        { id: 2, text: '可见楼层' },
    ];
    const adapter = createTavernHelperAdapter({
        TavernHelper: {
            getLastMessageId: () => 2,
            getChatMessages(_range, options = {}) {
                if (options.hide_state === 'hidden') {
                    return [{ message_id: 1 }];
                }
                return messages;
            },
        },
        document: {
            querySelectorAll: () => [],
        },
    });

    const normalized = await adapter.listMessages();
    const current = await adapter.getCurrentMessage();

    assert.equal(normalized[1].isHidden, true);
    assert.equal(current.id, 2);
});

test('gate:host:tavern-helper-adapter-falls-back-to-sillytavern-context-chat', async () => {
    const adapter = createTavernHelperAdapter({
        SillyTavern: {
            getContext() {
                return {
                    chat: [
                        { mes: '玩家发言', is_user: true },
                        { mes: '第一条 AI 楼层' },
                        { mes: '隐藏楼层', is_hidden: true },
                        { mes: '第二条 AI 楼层' },
                    ],
                };
            },
        },
        document: {
            querySelectorAll: () => [],
        },
    });

    const current = await adapter.getCurrentMessage();
    const hidden = await adapter.getMessageById(2);

    assert.equal(current.id, 3);
    assert.equal(current.text, '第二条 AI 楼层');
    assert.equal(hidden.isHidden, true);
});

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
    return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

function buildStoredZip(filename, bytes) {
    const nameBytes = Buffer.from(String(filename || ''), 'utf8');
    const dataBytes = Buffer.from(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(0, 12);
    header.writeUInt32LE(0, 14);
    header.writeUInt32LE(dataBytes.length, 18);
    header.writeUInt32LE(dataBytes.length, 22);
    header.writeUInt16LE(nameBytes.length, 26);
    header.writeUInt16LE(0, 28);
    return Buffer.concat([header, nameBytes, dataBytes]);
}

function createFakeImageNode(url) {
    return {
        tagName: 'IMG',
        src: url,
        currentSrc: url,
        ownerDocument: null,
        className: '',
        style: {
            backgroundImage: '',
        },
        getAttribute() {
            return null;
        },
        closest() {
            return null;
        },
        querySelector() {
            return null;
        },
    };
}

function createTestMesTextRoot() {
    const children = [];
    return {
        ownerDocument: {
            createElement() {
                return createTestElement();
            },
        },
        children,
        appendChild(node) {
            node.parentNode = this;
            node.parentElement = this;
            children.push(node);
            return node;
        },
        dispatchEvent() {
            return true;
        },
        querySelector(selector) {
            return this.querySelectorAll(selector)[0] || null;
        },
        querySelectorAll(selector) {
            const owned = children.filter((child) => {
                const hasOwnedClass = String(child.className || '').split(/\s+/).includes('igs-image-placeholder');
                const hasOwnedAttr = child.getAttribute && child.getAttribute('data-igs-image-placeholder') === '1';
                const hasLegacyClass = String(child.className || '').split(/\s+/).includes('igs-img-ph');
                return selector === '[data-igs-image-placeholder="1"], .igs-image-placeholder'
                    ? hasOwnedClass || hasOwnedAttr
                    : selector === '.igs-img-ph'
                        ? hasLegacyClass
                        : false;
            });
            return owned;
        },
    };
}

function createTestElement() {
    const attributes = new Map();
    return {
        className: '',
        style: {},
        textContent: '',
        parentNode: null,
        parentElement: null,
        setAttribute(name, value) {
            attributes.set(name, String(value));
        },
        getAttribute(name) {
            return attributes.has(name) ? attributes.get(name) : null;
        },
        remove() {
            if (!this.parentNode || !Array.isArray(this.parentNode.children)) return;
            const index = this.parentNode.children.indexOf(this);
            if (index >= 0) this.parentNode.children.splice(index, 1);
            this.parentNode = null;
            this.parentElement = null;
        },
    };
}

test('gate:generated-images:chami-provider-extracts-images-from-indexeddb-by-id-order', async () => {
    function fakeImg(id, hash) {
        const attrs = { 'data-image-id': String(id), 'data-location-hash': hash, 'data-is-loaded': 'false', class: 'tsp-generated-image' };
        return { getAttribute: (name) => (name in attrs ? attrs[name] : null) };
    }
    // DOM order scrambled: 70, 69, 71
    const nodes = [fakeImg(70, 'hash70'), fakeImg(69, 'hash69'), fakeImg(71, 'hash71')];
    const root = { querySelectorAll: (sel) => (sel === '.tsp-generated-image' ? nodes.slice() : []) };
    const records = {
        69: { id: 69, locationHash: 'hash69', imageData: 'data:image/png;base64,AAA69' },
        70: { id: 70, locationHash: 'hash70', imageData: 'data:image/png;base64,AAA70' },
        71: { id: 71, locationHash: 'hash71', imageData: 'data:image/png;base64,AAA71' },
    };
    const requestedBatches = [];
    const globalObject = {
        TavernScenePlugin: {
            db: {
                async getImageDataBatch(ids) {
                    requestedBatches.push(ids.slice());
                    return ids.map((id) => records[id]).filter(Boolean);
                },
            },
        },
    };

    const images = await chamiProvider.extractImages({ roots: [root], global: globalObject, scopePolicy: {} });

    assert.equal(images.length, 3);
    // batch requested in ascending id order regardless of scrambled DOM order
    assert.deepEqual(requestedBatches[0], [69, 70, 71]);
    // order field equals imageId so downstream sorts correctly
    assert.deepEqual(images.map((i) => i.order), [69, 70, 71]);
    assert.deepEqual(images.map((i) => i.url), [
        'data:image/png;base64,AAA69',
        'data:image/png;base64,AAA70',
        'data:image/png;base64,AAA71',
    ]);
    assert.equal(images[0].source, 'provider-db');
    assert.equal(images[0].locationHash, 'hash69');
});

test('gate:generated-images:chami-provider-falls-back-to-dom-when-db-unavailable', async () => {
    const root = { querySelectorAll: () => [] };
    const images = await chamiProvider.extractImages({ roots: [root], global: {}, scopePolicy: {} });
    assert.ok(Array.isArray(images));
    assert.equal(images.length, 0);
});
