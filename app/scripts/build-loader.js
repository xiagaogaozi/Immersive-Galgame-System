import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(appRoot, '..');
const loaderRoot = path.join(projectRoot, 'loader');
const jsPath = path.join(loaderRoot, 'igs-loader.js');
const jsonPath = path.join(loaderRoot, 'igs-loader.json');
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const releaseJsonName = `酒馆助手脚本-沉浸式Galgame系统（自动更新） v${packageJson.version}.json`;
const releaseJsonPath = path.join(loaderRoot, releaseJsonName);

const content = fs.readFileSync(jsPath, 'utf8');
if (!content.includes('igs.bundle.js') || !content.includes('igs.bundle.css')) {
    throw new Error('Loader source must reference igs.bundle.js and igs.bundle.css.');
}

const loaderJson = {
    type: 'script',
    enabled: false,
    name: '沉浸式Galgame系统（自动更新）',
    id: 'dfb8828d-1687-4aff-84e3-e192def8d389',
    content,
    info: [
        'Immersive Galgame System 自动更新 loader。',
        '默认从 GitHub/jsDelivr 加载 app/dist/igs.bundle.css 与 app/dist/igs.bundle.js。',
        '测试前请确认仓库或发布资产为公开可访问。',
    ].join('\n'),
    button: {
        enabled: true,
        buttons: [
            { name: '沉浸式Galgame系统', visible: false },
        ],
    },
    data: {},
    export_with: {
        data: true,
        button: true,
    },
};

fs.writeFileSync(jsonPath, `${JSON.stringify(loaderJson, null, 2)}\n`, 'utf8');
fs.writeFileSync(releaseJsonPath, `${JSON.stringify(loaderJson, null, 2)}\n`, 'utf8');

const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
if (parsed.content !== content) {
    throw new Error('Loader JSON content does not match loader source.');
}
const releaseParsed = JSON.parse(fs.readFileSync(releaseJsonPath, 'utf8'));
if (releaseParsed.content !== content || releaseParsed.name !== loaderJson.name) {
    throw new Error('Versioned release JSON does not match loader source.');
}

console.log(`loader:build ok ${path.relative(projectRoot, jsonPath)}`);
console.log(`loader:release ok ${path.relative(projectRoot, releaseJsonPath)}`);

// Debug loader: derived from the production source so it never drifts.
// Difference: sets root.IGS_DEBUG = true before injecting the bundle, enabling
// igsDebug() [DEBUG-*] logging. Not part of the public release.
const debugMarker = 'const root = resolveRootWindow();';
if (!content.includes(debugMarker)) {
    throw new Error('Loader source missing expected root marker for debug build.');
}
const debugContent = content
    .replace(debugMarker, `${debugMarker}\n    try { root.IGS_DEBUG = true; } catch (vnDebugError) { /* ignore */ }`)
    .replace("INSTANCE_KEY = '__IGS_AUTO_UPDATE_LOADER__'", "INSTANCE_KEY = '__IGS_AUTO_UPDATE_LOADER_DEBUG__'");

const debugJsPath = path.join(loaderRoot, 'igs-loader-debug.js');
const debugJsonPath = path.join(loaderRoot, 'igs-loader-debug.json');
fs.writeFileSync(debugJsPath, debugContent, 'utf8');

const debugLoaderJson = {
    type: 'script',
    enabled: false,
    name: '沉浸式Galgame系统（调试版）',
    id: 'f1c4a3d2-9b6e-4a71-8c2d-7e5b0a9d3f64',
    content: debugContent,
    info: [
        'Immersive Galgame System 调试版 loader（仅供开发测试）。',
        '与正式版加载同一个远程 bundle，但会设置 IGS_DEBUG=true，输出 [DEBUG-*] 控制台日志。',
        '不要随正式版一起发布给普通用户。',
    ].join('\n'),
    button: {
        enabled: false,
        buttons: [],
    },
    data: {},
    export_with: {
        data: true,
        button: true,
    },
};
fs.writeFileSync(debugJsonPath, `${JSON.stringify(debugLoaderJson, null, 2)}\n`, 'utf8');

const debugParsed = JSON.parse(fs.readFileSync(debugJsonPath, 'utf8'));
if (debugParsed.content !== debugContent || !debugContent.includes('root.IGS_DEBUG = true')) {
    throw new Error('Debug loader JSON content does not match debug loader source.');
}

console.log(`loader:debug ok ${path.relative(projectRoot, debugJsonPath)}`);
