import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(appRoot, '..');
const loaderRoot = path.join(projectRoot, 'loader');
const jsPath = path.join(loaderRoot, 'vn-loader.js');
const jsonPath = path.join(loaderRoot, 'vn-loader.json');
const packageJson = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const releaseJsonName = `酒馆助手脚本-Visual Novel（自动更新） v${packageJson.version}.json`;
const releaseJsonPath = path.join(loaderRoot, releaseJsonName);

const content = fs.readFileSync(jsPath, 'utf8');
if (!content.includes('vn.bundle.js') || !content.includes('vn.bundle.css')) {
    throw new Error('Loader source must reference vn.bundle.js and vn.bundle.css.');
}

const loaderJson = {
    type: 'script',
    enabled: false,
    name: 'Visual Novel（自动更新）',
    id: 'dfb8828d-1687-4aff-84e3-e192def8d389',
    content,
    info: [
        'Visual Novel 自动更新 loader。',
        '默认从 GitHub/jsDelivr 加载 app/dist/vn.bundle.css 与 app/dist/vn.bundle.js。',
        '测试前请确认仓库或发布资产为公开可访问。',
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
