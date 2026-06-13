import { collectProviderImages, listBuiltinImageProviders } from './provider-runtime.js';
import { createMessageImageCache } from '../media/message-image-cache.js';
import {
    detectExternalImageAdapter,
    getGlobalDetectionRoots,
    findDomRegenerateButtons,
} from './dom-image-candidates.js';
import { getMessageScopedRoots } from '../host/tavern-helper-adapter.js';

export function createReaderImageService(options = {}) {
    const globalObject = options.global || globalThis.window || globalThis;
    const hostAdapter = options.hostAdapter || null;
    const cache = options.cache || createMessageImageCache();
    const builtinProviders = normalizeProviders(options.providers || listBuiltinImageProviders());
    const imageGenerator = typeof options.imageGenerator === 'function' ? options.imageGenerator : null;
    const fetchFn = typeof options.fetch === 'function' ? options.fetch : null;

    return {
        registerProviders(registry) {
            if (!registry || typeof registry.register !== 'function') return;
            for (const provider of builtinProviders) {
                registry.register(provider);
            }
        },

        async collect(context = {}) {
            const messageId = normalizeMessageId(firstDefined(
                context.messageId,
                context.message && context.message.id,
                context.scene && context.scene.messageId,
            ));
            if (messageId == null) {
                return emptyImageState({ ok: false, reason: 'invalid-message-id' });
            }

            const message = await resolveMessageContext(context, hostAdapter, messageId);
            const unifiedSettings = context.unifiedSettings || {};
            const imageApi = resolveImageApi(unifiedSettings);
            const roots = resolveContextRoots(message, globalObject);
            const cachedEntry = cache.get(messageId);
            const providerImages = await collectProviderImages(buildProviderContext({
                context,
                message,
                unifiedSettings,
                roots,
                globalObject,
                fetchFn,
            }), resolveActiveProviders(context.providers, builtinProviders, imageApi));
            const sceneImages = collectSceneImages(context.scene, context.render);
            const cachedImages = cachedEntry && Array.isArray(cachedEntry.images) ? cachedEntry.images : [];
            const images = uniqueImages([
                ...providerImages,
                ...cachedImages,
                ...sceneImages,
            ]);
            const stored = cache.remember(messageId, images);
            if (stored.ok === false) return emptyImageState(stored);
            return buildImageState(stored.entry, context.currentIndex);
        },

        async generate(context = {}) {
            const message = await resolveMessageContext(context, hostAdapter, normalizeMessageId(context.messageId));
            const unifiedSettings = context.unifiedSettings || {};
            const imageApi = resolveImageApi(unifiedSettings);
            const roots = resolveContextRoots(message, globalObject);
            const request = buildGenerationRequest(context);
            const override = typeof context.imageGenerator === 'function' ? context.imageGenerator : imageGenerator;

            if (typeof override === 'function') {
                try {
                    const generated = await override(request, {
                        ...cloneData(context.generateOptions || {}),
                        message,
                        unifiedSettings,
                        imageApi,
                    });
                    return normalizeGeneratedResult(generated, request);
                } catch (error) {
                    return buildErrorResult(error, 'provider-not-enabled', { request });
                }
            }

            const provider = resolveGenerationProvider(
                resolveActiveProviders(context.providers, builtinProviders, imageApi),
                imageApi,
            );
            if (!provider || typeof provider.generate !== 'function') {
                return { ok: false, reason: 'provider-not-enabled', request };
            }

            try {
                const result = await provider.generate(request, buildProviderContext({
                    context,
                    message,
                    unifiedSettings,
                    roots,
                    globalObject,
                    fetchFn,
                }));
                return normalizeGeneratedResult(result, request);
            } catch (error) {
                return buildErrorResult(error, 'image-generate-failed', { request });
            }
        },

        async fetchModels(context = {}) {
            const unifiedSettings = context.unifiedSettings || context.settings || {};
            const imageApi = resolveImageApi(unifiedSettings);
            const provider = resolveGenerationProvider(
                resolveActiveProviders(context.providers, builtinProviders, imageApi),
                imageApi,
            );
            if (!provider || typeof provider.fetchModels !== 'function') {
                return { ok: false, reason: 'provider-not-enabled' };
            }
            try {
                return await provider.fetchModels(context.request || {}, buildProviderContext({
                    context,
                    message: context.message || null,
                    unifiedSettings,
                    roots: resolveContextRoots(context.message || null, globalObject),
                    globalObject,
                    fetchFn,
                }));
            } catch (error) {
                return buildErrorResult(error, 'fetch-models-failed');
            }
        },

        async test(context = {}) {
            const message = context.message || null;
            const unifiedSettings = context.unifiedSettings || context.settings || {};
            const imageApi = resolveImageApi(unifiedSettings);
            if (imageApi.mode === 'nai') {
                const result = await this.generate({
                    ...context,
                    message,
                    unifiedSettings,
                    prompt: String(context.prompt || 'simple visual novel background, soft light, no text').trim(),
                    request: context.request || {},
                });
                if (result.ok === false) return result;
                return {
                    ok: true,
                    message: '图像 API 真实生成测试成功',
                    url: result.url,
                    providerId: result.providerId,
                };
            }

            const roots = message
                ? resolveContextRoots(message, globalObject)
                : getGlobalDetectionRoots(globalObject);
            return detectExternalImageAdapter({
                roots,
                imageApi,
                global: globalObject,
            });
        },

        async regenerate(context = {}) {
            const messageId = normalizeMessageId(firstDefined(
                context.messageId,
                context.message && context.message.id,
            ));
            if (messageId == null) {
                return { ok: false, reason: 'invalid-message-id', messageId };
            }

            const currentIndex = normalizeIndex(context.currentIndex);
            const unifiedSettings = context.unifiedSettings || {};
            const imageApi = resolveImageApi(unifiedSettings);
            const currentState = context.imageState || await this.collect({
                ...context,
                currentIndex,
                providers: context.providers,
            });

            if (imageApi.mode === 'nai') {
                const generated = await this.generate({
                    ...context,
                    messageId,
                    currentIndex,
                    unifiedSettings,
                    prompt: String(context.prompt || '').trim(),
                    request: context.request || {},
                });
                if (!generated || generated.ok === false || !generated.url) {
                    return {
                        ok: false,
                        reason: generated && generated.reason || 'provider-not-enabled',
                        imageState: currentState,
                    };
                }
                const nextImages = replaceImageAtIndex(
                    currentState.images,
                    currentIndex,
                    {
                        url: generated.url,
                        providerId: String(generated.providerId || 'igs.provider.nai').trim(),
                        source: String(generated.source || 'generated-image').trim(),
                        filename: String(generated.filename || '').trim(),
                    },
                );
                const stored = cache.remember(messageId, nextImages);
                return {
                    ok: stored.ok !== false,
                    reason: 'generated-image-updated',
                    imageState: buildImageState(stored.entry, currentIndex),
                    url: generated.url,
                };
            }

            const button = await resolveRegenerateButton(hostAdapter, context, messageId, currentIndex);
            if (!button || typeof button.click !== 'function') {
                return { ok: false, reason: 'regen-button-not-found', imageState: currentState };
            }

            button.click();
            const pollIntervalMs = normalizePositiveInteger(imageApi.pollIntervalMs, 2000);
            const pollAttempts = normalizePositiveInteger(imageApi.pollAttempts, 60);
            const baselineSignature = String(currentState.signature || '');
            const baselineUrl = String(currentState.currentUrl || '');
            let lastState = currentState;

            for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
                await wait(pollIntervalMs, globalObject);
                lastState = await this.collect({
                    ...context,
                    currentIndex,
                    providers: context.providers,
                });
                if (!lastState || lastState.ok === false) continue;
                const nextSignature = String(lastState.signature || '');
                const nextUrl = String(lastState.currentUrl || '');
                if ((nextUrl && nextUrl !== baselineUrl) || (nextSignature && nextSignature !== baselineSignature)) {
                    return {
                        ok: true,
                        reason: 'external-image-updated',
                        imageState: lastState,
                        url: nextUrl,
                    };
                }
            }

            return {
                ok: false,
                reason: 'image-poll-timeout',
                imageState: lastState,
            };
        },

        async save(context = {}) {
            const url = String(firstDefined(context.url, context.currentUrl, '') || '').trim();
            if (!url) return { ok: false, reason: 'no-image-to-save' };
            if (!isDownloadableUrl(url)) {
                return { ok: false, reason: 'unsupported-save-url', url };
            }

            const filename = String(context.filename || buildFilename(context.messageId, context.currentIndex, url)).trim();
            const doc = getDocument(globalObject);
            const anchor = doc && typeof doc.createElement === 'function' ? doc.createElement('a') : null;

            if (anchor && doc.body && typeof doc.body.appendChild === 'function' && typeof anchor.click === 'function') {
                anchor.href = url;
                anchor.download = filename;
                doc.body.appendChild(anchor);
                anchor.click();
                if (typeof anchor.remove === 'function') anchor.remove();
            }

            return {
                ok: true,
                url,
                filename,
                downloaded: Boolean(anchor),
            };
        },
    };
}

function collectSceneImages(scene = {}, render = {}) {
    const images = [];
    const generated = scene && scene.generatedImage && scene.generatedImage.value;
    const renderGenerated = render
        && render.stage
        && render.stage.layers
        && render.stage.layers.generated
        && render.stage.layers.generated.resource
        && render.stage.layers.generated.resource.value;
    const background = render
        && render.stage
        && render.stage.layers
        && render.stage.layers.background
        && render.stage.layers.background.resource
        && render.stage.layers.background.resource.url;

    for (const candidate of [
        { url: renderGenerated, providerId: 'igs.scene.generated', source: 'scene-generated' },
        { url: generated, providerId: 'igs.scene.generated', source: 'scene-generated' },
        { url: background, providerId: 'igs.scene.background', source: 'scene-background' },
    ]) {
        const url = String(candidate.url || '').trim();
        if (!url) continue;
        images.push({ ...candidate, url });
    }

    return uniqueImages(images);
}

function buildImageState(entry, currentIndex = 0) {
    if (!entry || typeof entry !== 'object') {
        return emptyImageState({ ok: true });
    }
    const images = Array.isArray(entry.images) ? cloneData(entry.images) : [];
    const activeIndex = images.length ? Math.max(0, Math.min(images.length - 1, normalizeIndex(currentIndex))) : 0;
    return {
        ok: true,
        messageId: entry.messageId,
        images,
        count: images.length,
        signature: String(entry.signature || ''),
        currentIndex: activeIndex,
        currentUrl: images[activeIndex] ? images[activeIndex].url : '',
    };
}

function emptyImageState(extra = {}) {
    return {
        ok: true,
        messageId: null,
        images: [],
        count: 0,
        signature: '',
        currentIndex: 0,
        currentUrl: '',
        ...extra,
    };
}

function resolveActiveProviders(explicitProviders, builtinProviders, imageApi = {}) {
    const sourceProviders = Array.isArray(explicitProviders) && explicitProviders.length
        ? normalizeProviders(explicitProviders)
        : builtinProviders;
    const mode = String(imageApi.mode || 'extension').trim();
    const requestedAdapter = String(imageApi.externalAdapter || 'auto').trim().toLowerCase();
    return sourceProviders.filter((provider) => {
        if (!provider || typeof provider !== 'object') return false;
        if (mode === 'nai') {
            return String(provider.providerType || '').trim() === 'nai';
        }
        if (String(provider.providerType || '').trim() === 'nai') {
            return false;
        }
        const adapterKey = String(provider.adapterKey || '').trim().toLowerCase();
        if (!adapterKey) return true;
        if (requestedAdapter === 'auto') return true;
        return adapterKey === requestedAdapter || adapterKey === 'generic';
    });
}

function resolveGenerationProvider(providers, imageApi = {}) {
    const mode = String(imageApi.mode || 'extension').trim();
    if (mode !== 'nai') return null;
    return normalizeProviders(providers).find((provider) => String(provider.providerType || '').trim() === 'nai') || null;
}

function resolveImageApi(unifiedSettings = {}) {
    const bridge = unifiedSettings.bridge && typeof unifiedSettings.bridge === 'object'
        ? unifiedSettings.bridge
        : {};
    const imageApi = unifiedSettings.imageApi && typeof unifiedSettings.imageApi === 'object'
        ? unifiedSettings.imageApi
        : bridge.imageApi && typeof bridge.imageApi === 'object'
            ? bridge.imageApi
            : {};
    return {
        mode: String(imageApi.mode || 'extension').trim() || 'extension',
        ...imageApi,
    };
}

function buildProviderContext({ context, message, unifiedSettings, roots, globalObject, fetchFn }) {
    return {
        ...context,
        message: message || null,
        messageId: firstDefined(context.messageId, message && message.id),
        root: roots[0] || message && message.element || null,
        roots,
        document: message && message.element && message.element.ownerDocument || context.document || null,
        settings: unifiedSettings,
        unifiedSettings,
        imageApi: resolveImageApi(unifiedSettings),
        global: globalObject,
        fetch: context.fetch || fetchFn || globalObject && globalObject.fetch || globalThis.fetch,
        AbortController: context.AbortController || globalObject && globalObject.AbortController || globalThis.AbortController,
        setTimeout: context.setTimeout || globalObject && globalObject.setTimeout || globalThis.setTimeout,
        clearTimeout: context.clearTimeout || globalObject && globalObject.clearTimeout || globalThis.clearTimeout,
    };
}

function buildGenerationRequest(context = {}) {
    const request = isPlainObject(context.request) ? cloneData(context.request) : {};
    const prompt = String(firstDefined(context.prompt, request.prompt, request.input, '') || '').trim();
    if (prompt && !request.prompt && !request.input) {
        request.prompt = prompt;
    }
    return request;
}

function normalizeGeneratedResult(result, request) {
    if (!result) return { ok: false, reason: 'provider-not-enabled', request };
    if (result.ok === false) return result;
    if (!result.url) return { ok: false, reason: 'provider-not-enabled', request };
    return {
        ok: true,
        ...result,
        providerId: String(result.providerId || '').trim(),
        source: String(result.source || 'generated-image').trim(),
        filename: String(result.filename || '').trim(),
    };
}

function buildErrorResult(error, fallbackReason, extra = {}) {
    return {
        ok: false,
        reason: error && error.message ? error.message : fallbackReason,
        error,
        ...extra,
    };
}

function resolveContextRoots(message, globalObject) {
    const roots = message ? getMessageScopedRoots(message) : [];
    if (roots.length) return roots;
    return getGlobalDetectionRoots(globalObject);
}

async function resolveMessageContext(context, hostAdapter, messageId) {
    if (context.message) return context.message;
    if (messageId == null || !hostAdapter || typeof hostAdapter.getMessageById !== 'function') {
        return null;
    }
    return hostAdapter.getMessageById(messageId);
}

function replaceImageAtIndex(images, index, image) {
    const normalizedImages = uniqueImages(Array.isArray(images) ? images : []);
    const nextIndex = normalizeIndex(index);
    const nextImage = uniqueImages([image])[0];
    if (!nextImage) return normalizedImages;
    const output = normalizedImages.slice();
    if (nextIndex < output.length) {
        output[nextIndex] = nextImage;
    } else {
        output.push(nextImage);
    }
    return uniqueImages(output);
}

function uniqueImages(images) {
    const output = [];
    const seen = new Set();
    for (const image of Array.isArray(images) ? images : []) {
        const url = String(image && image.url || '').trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        output.push({
            url,
            providerId: String(image.providerId || '').trim(),
            source: String(image.source || '').trim(),
            filename: String(image.filename || '').trim(),
        });
    }
    return output;
}

function normalizeProviders(providers) {
    const output = [];
    const seen = new Set();
    for (const provider of Array.isArray(providers) ? providers : []) {
        if (!provider || typeof provider !== 'object') continue;
        const key = String(provider.id || provider.label || output.length);
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(provider);
    }
    return output;
}

function normalizeMessageId(value) {
    const id = Number(value);
    if (!Number.isFinite(id) || id < 0) return null;
    return id;
}

function normalizeIndex(value) {
    const index = Number(value);
    if (!Number.isFinite(index) || index < 0) return 0;
    return Math.floor(index);
}

function normalizePositiveInteger(value, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
    return Math.floor(numeric);
}

function buildFilename(messageId, currentIndex, url) {
    const extension = resolveFileExtension(url);
    const safeMessageId = normalizeMessageId(messageId) ?? 'scene';
    return `igs-${safeMessageId}-${normalizeIndex(currentIndex) + 1}.${extension}`;
}

function resolveFileExtension(url) {
    const match = String(url || '').match(/\.([a-zA-Z0-9]{2,5})(?:[?#]|$)/);
    return match ? match[1].toLowerCase() : 'png';
}

function isDownloadableUrl(url) {
    return /^(https?:|blob:|data:image\/)/i.test(String(url || '').trim());
}

function getDocument(globalObject) {
    try {
        if (globalObject && globalObject.document) return globalObject.document;
    } catch (error) {
        // Cross-origin parents are ignored.
    }
    return typeof document !== 'undefined' ? document : null;
}

async function resolveRegenerateButton(hostAdapter, context, messageId, imageIndex) {
    if (hostAdapter && typeof hostAdapter.findRegenerateButton === 'function') {
        const button = await hostAdapter.findRegenerateButton(messageId, imageIndex);
        if (button) return button;
    }
    const message = context && context.message;
    if (!message) return null;
    const buttons = findDomRegenerateButtons(getMessageScopedRoots(message));
    return buttons[normalizeIndex(imageIndex)] || null;
}

function wait(duration, globalObject) {
    return new Promise((resolve) => {
        const timeout = globalObject && typeof globalObject.setTimeout === 'function'
            ? globalObject.setTimeout.bind(globalObject)
            : setTimeout;
        timeout(resolve, duration);
    });
}

function firstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null) return value;
    }
    return undefined;
}

function cloneData(value) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(cloneData);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)]));
    }
    return value;
}

function isPlainObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}
