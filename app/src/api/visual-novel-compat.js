import { resolveLegacyReaderMode } from '../storage/legacy-visual-novel.js';

const READER_MODES = Object.freeze(['pc', 'mobile', 'web', 'fullscreen']);

export function createVisualNovelCompatApi(app) {
    return {
        openSettings(options = {}) {
            const payload = cloneData(options);
            if (app.events && typeof app.events.emit === 'function') {
                app.events.emit('igs:settings-requested', payload);
            }
            if (!app.visualNovelUi || typeof app.visualNovelUi.openSettings !== 'function') {
                return { ok: false, reason: 'settings-ui-not-mounted', options: payload };
            }
            return app.visualNovelUi.openSettings(payload);
        },

        getConfig() {
            return cloneData(app.getState().config || {});
        },

        getUnifiedSettings(options = {}) {
            if (typeof app.getUnifiedSettingsSnapshot === 'function') {
                return app.getUnifiedSettingsSnapshot(options);
            }

            const legacy = getLegacySettings(app);
            const bridge = cloneData(app.getState().config || {});
            const readerMode = resolveReaderMode(options, legacy, bridge);
            const readerSettingsByMode = legacy.readerSettingsByMode || {};
            const readerSettings = cloneData(readerSettingsByMode[readerMode] || legacy.readerSettings || {});

            return {
                version: app.version,
                bridge,
                imageApi: cloneData(bridge.imageApi || {}),
                readerMode,
                readerSettings,
            };
        },

        async openViewerFromMessage(messageId, mode) {
            const normalizedId = normalizeMessageId(messageId);
            const readerMode = resolveReaderMode({ mode }, getLegacySettings(app), app.getState().config || {});
            if (normalizedId == null) {
                return { ok: false, reason: 'invalid-message-id', messageId, mode: readerMode };
            }
            if (!app.hostAdapter || typeof app.hostAdapter.getMessageById !== 'function') {
                return { ok: false, reason: 'message-lookup-not-supported', messageId: normalizedId, mode: readerMode };
            }
            const message = await app.hostAdapter.getMessageById(normalizedId);
            if (!message) {
                return { ok: false, reason: 'message-not-found', messageId: normalizedId, mode: readerMode };
            }
            const refreshed = await app.refresh({
                message,
                messageId: normalizedId,
                viewerMode: readerMode,
            });
            return openReaderUi(app, {
                message,
                messageId: normalizedId,
                mode: readerMode,
                viewerMode: readerMode,
                render: refreshed.render,
                scene: refreshed.scene,
            }, refreshed);
        },

        async openLatestAvailable(mode, options = {}) {
            const readerMode = resolveReaderMode({ mode }, getLegacySettings(app), app.getState().config || {});
            if (!app.hostAdapter || typeof app.hostAdapter.getCurrentMessage !== 'function') {
                return { ok: false, reason: 'missing-host-message-api', mode: readerMode, options: cloneData(options) };
            }
            const message = await app.hostAdapter.getCurrentMessage();
            if (!message) {
                return { ok: false, reason: 'no-message', mode: readerMode, options: cloneData(options) };
            }
            const refreshed = await app.refresh({
                message,
                messageId: message.id,
                viewerMode: readerMode,
            });
            return openReaderUi(app, {
                message,
                messageId: message.id,
                mode: readerMode,
                viewerMode: readerMode,
                render: refreshed.render,
                scene: refreshed.scene,
            }, refreshed);
        },

        generateImage(request, options = {}) {
            return {
                ok: false,
                reason: 'provider-not-enabled',
                request: cloneData(request),
                options: cloneData(options),
            };
        },
    };
}

function getLegacySettings(app) {
    if (!app || typeof app.getLegacyVisualNovelSettings !== 'function') {
        return {
            ok: true,
            bridge: {},
            displayMode: '',
            readerMode: 'pc',
            readerSettings: {},
            readerSettingsByMode: {},
        };
    }
    return app.getLegacyVisualNovelSettings();
}

function resolveReaderMode(options, legacySettings, bridgeConfig) {
    const requestedMode = options && typeof options === 'object' ? options.mode : options;
    const legacyDisplayMode = legacySettings && legacySettings.ok !== false ? legacySettings.displayMode : '';
    const legacyBridge = legacySettings && legacySettings.ok !== false ? legacySettings.bridge : {};
    const resolved = resolveLegacyReaderMode(
        requestedMode,
        legacyDisplayMode,
        bridgeConfig && Object.keys(bridgeConfig).length ? bridgeConfig : legacyBridge,
    );
    return READER_MODES.includes(resolved) ? resolved : 'pc';
}

function normalizeMessageId(messageId) {
    const value = Number(messageId);
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
}

function cloneData(value) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(cloneData);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)]));
    }
    return value;
}

function openReaderUi(app, payload, refreshed) {
    if (!app.visualNovelUi || typeof app.visualNovelUi.openReader !== 'function') {
        return refreshed;
    }
    const reader = app.visualNovelUi.openReader(payload, { mode: payload.mode });
    return {
        ...refreshed,
        ok: refreshed.ok !== false && reader.ok !== false,
        reader,
    };
}
