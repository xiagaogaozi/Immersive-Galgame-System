import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const projectRoot = path.resolve(appRoot, '..');
const loaderRoot = path.join(projectRoot, 'loader');
const jsPath = path.join(loaderRoot, 'igs-loader.js');
const jsonPath = path.join(loaderRoot, 'igs-loader.json');

const content = fs.readFileSync(jsPath, 'utf8');
if (!content.includes('igs.bundle.js') || !content.includes('igs.bundle.css')) {
    throw new Error('Loader source must reference igs.bundle.js and igs.bundle.css.');
}

const loaderJson = {
    type: 'script',
    enabled: false,
    name: '沉浸式 Galgame 系统（自动更新）',
    id: 'dfb8828d-1687-4aff-84e3-e192def8d389',
    content,
    info: [
        '沉浸式 Galgame 系统自动更新 loader。',
        '默认从 GitHub/jsDelivr 加载 app/dist/igs.bundle.css 与 app/dist/igs.bundle.js。',
        '测试前请确认仓库或发布资产为公开可访问。',
    ].join('\n'),
    button: {
        enabled: true,
        buttons: [
            {
                name: '启动 IGS',
                script: "window.IGS && window.IGS.openLatestAvailable ? window.IGS.openLatestAvailable() : alert('IGS 尚未加载完成，请刷新页面或检查控制台的 IGS Loader 报错。')",
            },
            {
                name: '重扫入口',
                script: "window.IGS && window.IGS.ensureMagicWandEntry ? window.IGS.ensureMagicWandEntry() : alert('IGS 尚未加载完成，无法重扫魔法棒入口。')",
            },
        ],
    },
    data: {},
    export_with: {
        data: true,
        button: true,
    },
};

fs.writeFileSync(jsonPath, `${JSON.stringify(loaderJson, null, 2)}\n`, 'utf8');

const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
if (parsed.content !== content) {
    throw new Error('Loader JSON content does not match loader source.');
}

console.log(`loader:build ok ${path.relative(projectRoot, jsonPath)}`);
