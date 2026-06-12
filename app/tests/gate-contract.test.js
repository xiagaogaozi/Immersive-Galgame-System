import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { dispatchImportBundle } from '../src/registry/import-dispatcher.js';
import { checkStyleContract } from '../src/styles/style-contract.js';

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

test('gate:style-contract:requires stable slots and reader bridge attributes', () => {
    const skin = readJson('fixtures/styles/skin-contract.json');
    const result = checkStyleContract(skin);

    assert.equal(result.ok, true);
    assert.deepEqual(result.missingSlots, []);
    assert.deepEqual(result.missingData, []);
});

test('gate:loader-json:matches loader source and references public bundle', () => {
    const loaderSource = fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.js'), 'utf8');
    const loaderJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'loader', 'igs-loader.json'), 'utf8'));

    assert.equal(loaderJson.type, 'script');
    assert.equal(loaderJson.name, '沉浸式 Galgame 系统（自动更新）');
    assert.equal(loaderJson.content, loaderSource);
    assert.match(loaderJson.content, /igs\.bundle\.js/);
    assert.match(loaderJson.content, /igs\.bundle\.css/);
    assert.doesNotMatch(loaderJson.content, /yuzi-phone/i);
});

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(appRoot, relativePath), 'utf8'));
}
