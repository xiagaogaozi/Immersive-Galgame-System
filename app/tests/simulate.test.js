import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { bootstrapIGS } from '../src/index.js';
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
                render(scene) {
                    rendered.push({ layer: 'dialogue', scene });
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
    assert.deepEqual(sendResult, { ok: true });
    assert.deepEqual(sent, ['选择：继续调查']);
    assert.deepEqual(igs.destroy(), { ok: true });
});

test('gate:simulation:generated image tag switches visual mode', async () => {
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

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}
