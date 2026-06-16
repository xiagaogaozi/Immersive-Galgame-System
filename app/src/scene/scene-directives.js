export function extractSceneDirectives(text) {
    const source = String(text || '');
    if (!source.trim()) return { directives: [], strippedText: source };

    const directives = [];
    const lines = source.split('\n');
    let lineCount = 0;
    let segmentCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const match = trimmed.match(/^@igs-scene:([^|\n]*?)\|([^|\n]*?)\|([^|\n]*?)\|(.*)$/);
        if (match) {
            directives.push({
                lineIndex: lineCount,
                character: (match[1] || '').trim() || null,
                mood: (match[2] || '').trim() || null,
                scene: (match[3] || '').trim() || null,
                dialogue: (match[4] || '').trim(),
                segmentIndex: segmentCount,
            });
        }
        if (trimmed) segmentCount++;
        lineCount++;
    }

    return { directives, strippedText: source };
}

export function resolveSceneStateAtIndex(directives, segmentIndex) {
    const state = { scene: '', character: '', mood: '' };
    if (!Array.isArray(directives) || !directives.length) return state;
    const targetIndex = normalizeSegmentIndex(segmentIndex);

    for (const directive of directives) {
        const directiveIndex = normalizeSegmentIndex(directive && directive.segmentIndex);
        if (directiveIndex != null && targetIndex != null && directiveIndex > targetIndex) {
            break;
        }
        if (directive.scene) state.scene = directive.scene;
        if (directive.character) state.character = directive.character;
        if (directive.mood) state.mood = directive.mood;
    }

    return state;
}

export function lookupSceneAssetUrls(sceneState, sceneAssets) {
    if (!sceneAssets || !sceneState) return { backgroundUrl: null, spriteUrl: null };

    const scenes = sceneAssets.scenes || {};
    const backgroundUrl = lookupAssetValue(scenes, sceneState.scene);

    let spriteUrl = null;
    const characters = sceneAssets.characters || {};
    if (sceneState.character && characters[sceneState.character]) {
        const charMoods = characters[sceneState.character];
        spriteUrl = lookupAssetValue(charMoods, sceneState.mood);
    }

    return { backgroundUrl, spriteUrl };
}

function lookupAssetValue(record, requestedKey) {
    if (!record || typeof record !== 'object') return null;
    if (requestedKey && record[requestedKey]) return record[requestedKey];
    if (record['默认']) return record['默认'];

    const filledEntries = Object.entries(record)
        .filter(([, value]) => typeof value === 'string' && value.trim());
    return filledEntries.length === 1 ? filledEntries[0][1] : null;
}

function normalizeSegmentIndex(value) {
    if (value == null || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return Math.floor(numeric);
}
