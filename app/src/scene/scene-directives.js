export function extractSceneDirectives(text) {
    const source = String(text || '');
    if (!source.trim()) return { directives: [], strippedText: source };

    const directives = [];
    const lines = source.split('\n');
    let lineCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const match = trimmed.match(/^@vn-scene:([^|\n]*?)\|([^|\n]*?)\|([^|\n]*?)\|(.*)$/);
        if (match) {
            directives.push({
                lineIndex: lineCount,
                character: (match[1] || '').trim() || null,
                mood: (match[2] || '').trim() || null,
                scene: (match[3] || '').trim() || null,
                dialogue: (match[4] || '').trim(),
            });
        }
        lineCount++;
    }

    return { directives, strippedText: source };
}

export function resolveSceneStateAtIndex(directives, segmentIndex) {
    const state = { scene: '', character: '', mood: '' };
    if (!Array.isArray(directives) || !directives.length) return state;

    for (const directive of directives) {
        if (directive.lineIndex > segmentIndex) break;
        if (directive.scene) state.scene = directive.scene;
        if (directive.character) state.character = directive.character;
        if (directive.mood) state.mood = directive.mood;
    }

    return state;
}

export function lookupSceneAssetUrls(sceneState, sceneAssets) {
    if (!sceneAssets || !sceneState) return { backgroundUrl: null, spriteUrl: null };

    let backgroundUrl = null;
    const scenes = sceneAssets.scenes || {};
    if (sceneState.scene && scenes[sceneState.scene]) {
        backgroundUrl = scenes[sceneState.scene];
    } else if (scenes['默认']) {
        backgroundUrl = scenes['默认'];
    }

    let spriteUrl = null;
    const characters = sceneAssets.characters || {};
    if (sceneState.character && characters[sceneState.character]) {
        const charMoods = characters[sceneState.character];
        if (sceneState.mood && charMoods[sceneState.mood]) {
            spriteUrl = charMoods[sceneState.mood];
        } else if (charMoods['默认']) {
            spriteUrl = charMoods['默认'];
        }
    }

    return { backgroundUrl, spriteUrl };
}
