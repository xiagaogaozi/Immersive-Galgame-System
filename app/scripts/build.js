import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const distRoot = path.join(appRoot, 'dist');
fs.mkdirSync(distRoot, { recursive: true });

const bundle = [
    "export * from '../src/index.js';",
    "import { bootstrapIGS } from '../src/index.js';",
    "const globalObject = globalThis.window || globalThis;",
    "if (globalObject && globalObject.IGS_AUTO_BOOTSTRAP !== false && !globalObject.IGS) {",
    "    bootstrapIGS({ global: globalObject });",
    "}",
    '',
].join('\n');

const css = [
    '.igs-stage { position: relative; width: 100%; height: 100%; }',
    '.igs-background-layer, .igs-generated-layer, .igs-character-layer, .igs-dialogue-layer, .igs-hud-layer, .igs-choice-layer, .igs-system-layer { position: absolute; inset: 0; }',
    '.igs-toolbar { display: flex; gap: 8px; }',
    '',
].join('\n');

const manifest = {
    name: 'immersive-galgame-system',
    version: '0.2.1',
    entry: 'igs.bundle.js',
    style: 'igs.bundle.css',
};

fs.writeFileSync(path.join(distRoot, 'igs.bundle.js'), bundle, 'utf8');
fs.writeFileSync(path.join(distRoot, 'igs.bundle.css'), css, 'utf8');
fs.writeFileSync(path.join(distRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

for (const name of ['igs.bundle.js', 'igs.bundle.css', 'manifest.json']) {
    const file = path.join(distRoot, name);
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
        throw new Error(`Build output is missing or empty: ${name}`);
    }
}

console.log('gate:build ok');
