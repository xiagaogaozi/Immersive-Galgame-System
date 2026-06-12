const API_GROUPS = [
    'imageProviders',
    'imageRequestBuilders',
    'actions',
    'components',
    'choiceComponents',
    'themePresets',
    'uiSkins',
    'sceneRegexPresets',
    'backgroundPacks',
    'characterPacks',
    'promptPresets',
];

export function createPublicApi(app) {
    const groupedApi = Object.fromEntries(API_GROUPS.map((name) => [name, createRegistryGroup(name)]));

    return {
        name: 'Immersive Galgame System',
        version: app.version,
        api: groupedApi,

        refresh: app.refresh,
        renderScene(textScene) {
            return app.refresh({ textScene });
        },
        typeAndSend: app.typeAndSend,
        getState: app.getState,
        destroy: app.destroy,

        openSettings() {
            return { ok: false, reason: 'settings-ui-not-mounted' };
        },
        getConfig() {
            return app.getState().config;
        },
        getUnifiedSettings() {
            return app.getState().config;
        },
        generateImage(request) {
            return { ok: false, reason: 'provider-not-enabled', request };
        },
    };
}

export function attachPublicApi(globalObject, api) {
    if (!globalObject) return api;
    globalObject.IGS = api;
    globalObject.ImmersiveGalgameSystem = api;
    return api;
}

export function detachPublicApi(globalObject, api) {
    if (!globalObject) return;
    if (globalObject.IGS === api) delete globalObject.IGS;
    if (globalObject.ImmersiveGalgameSystem === api) delete globalObject.ImmersiveGalgameSystem;
}

function createRegistryGroup(groupName) {
    const items = new Map();

    return {
        register(item) {
            if (!item || !item.id) {
                return { ok: false, reason: 'missing-id', groupName };
            }
            items.set(item.id, item);
            return { ok: true, item };
        },
        unregister(id) {
            return { ok: items.delete(id), id };
        },
        get(id) {
            return items.get(id) || null;
        },
        list() {
            return Array.from(items.values());
        },
    };
}
