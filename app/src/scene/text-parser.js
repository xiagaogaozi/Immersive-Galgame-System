const TAG_ALIASES = Object.freeze({
    speaker: ['speaker', '角色', '说话人'],
    emotion: ['emotion', '情绪'],
    time: ['time', '时间'],
    weather: ['weather', '天气'],
    location: ['location', '地点', '位置'],
    generatedImage: ['generatedImage', '生图', '插图'],
});

export function parseSceneText(text = '', options = {}) {
    const scene = {
        messageId: options.messageId == null ? null : options.messageId,
        text: '',
    };
    const body = [];

    for (const line of String(text || '').split(/\r?\n/)) {
        const tag = parseTag(line);
        if (tag) {
            applyTag(scene, tag);
            continue;
        }
        body.push(line);
    }

    scene.text = body.join('\n').trim();
    parseSpeakerPrefix(scene);
    return scene;
}

function parseTag(line) {
    const match = String(line).match(/^\s*\[([^:\]：]+)\s*[:：]\s*(.*?)\]\s*$/);
    if (!match) return null;
    return {
        key: match[1].trim(),
        value: match[2].trim(),
    };
}

function applyTag(scene, tag) {
    const normalizedKey = normalizeKey(tag.key);
    if (!normalizedKey) return;
    if (normalizedKey === 'generatedImage') {
        scene.generatedImage = tag.value ? { source: 'text-tag', value: tag.value } : null;
        return;
    }
    scene[normalizedKey] = tag.value;
}

function normalizeKey(key) {
    return Object.entries(TAG_ALIASES).find(([, aliases]) => aliases.includes(key))?.[0] || null;
}

function parseSpeakerPrefix(scene) {
    if (scene.speaker || !scene.text) return;
    const match = scene.text.match(/^([^:：\n]{1,24})\s*[:：]\s*(.+)$/s);
    if (!match) return;
    scene.speaker = match[1].trim();
    scene.text = match[2].trim();
}
