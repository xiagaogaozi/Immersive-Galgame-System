const SCENE_RE = /^\[igs-scene:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\]$/;
const CHAR_RE = /^\[igs-char:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\]$/;
const THOUGHT_RE = /^\[igs-thought:([^|\]]+)\|([^|\]]+)\|([^|\]]+)\]$/;

export function extractSceneDirectives(text) {
    const source = String(text || '');
    if (!source.trim()) return { directives: [], strippedText: source };

    const directives = [];
    const lines = source.split('\n');
    let lineCount = 0;
    let segmentCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        let m;
        let isDirective = false;
        if ((m = trimmed.match(SCENE_RE))) {
            isDirective = true;
            directives.push({ type: 'scene', scene: m[1].trim(), time: m[2].trim(), weather: m[3].trim(), segmentIndex: segmentCount, lineIndex: lineCount });
        } else if ((m = trimmed.match(CHAR_RE))) {
            isDirective = true;
            directives.push({ type: 'char', character: m[1].trim(), mood: m[2].trim(), dialogue: m[3].trim(), segmentIndex: segmentCount, lineIndex: lineCount });
        } else if ((m = trimmed.match(THOUGHT_RE))) {
            isDirective = true;
            directives.push({ type: 'thought', character: m[1].trim(), mood: m[2].trim(), thought: m[3].trim(), segmentIndex: segmentCount, lineIndex: lineCount });
        }
        if (trimmed && !isDirective) segmentCount++;
        lineCount++;
    }

    return { directives, strippedText: source };
}

export function resolveSceneStateAtIndex(directives, segmentIndex) {
    const state = { scene: '', time: '', weather: '', character: '', mood: '', dialogue: '', thought: '' };
    if (!Array.isArray(directives) || !directives.length) return state;
    const targetIndex = normalizeSegmentIndex(segmentIndex);

    for (const directive of directives) {
        const directiveIndex = normalizeSegmentIndex(directive && directive.segmentIndex);
        if (directiveIndex != null && targetIndex != null && directiveIndex > targetIndex) break;
        if (directive.type === 'scene') {
            if (directive.scene) state.scene = directive.scene;
            if (directive.time) state.time = directive.time;
            if (directive.weather) state.weather = directive.weather;
        } else if (directive.type === 'char') {
            if (directive.character) state.character = directive.character;
            if (directive.mood) state.mood = directive.mood;
            if (directive.dialogue) state.dialogue = directive.dialogue;
        } else if (directive.type === 'thought') {
            if (directive.character) state.character = directive.character;
            if (directive.mood) state.mood = directive.mood;
            if (directive.thought) state.thought = directive.thought;
        }
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
