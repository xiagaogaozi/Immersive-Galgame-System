import { collectProviderImages, listBuiltinImageProviders } from './provider-runtime.js';
import { createMessageImageCache } from '../media/message-image-cache.js';

export function createReaderImageService(options = {}) {
    const globalObject = options.global || globalThis.window || globalThis;
    const hostAdapter = options.hostAdapter || null;
    const cache = options.cache || createMessageImageCache();
    const builtinProviders = normalizeProviders(options.providers || listBuiltinImageProviders());
    const imageGenerator = typeof options.imageGenerator === 'function' ? options.imageGenerator : null;

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

            const cachedEntry = cache.get(messageId);
            const providerImages = await collectProviderImages({
                message: context.message || null,
                root: context.message && context.message.element || null,
                document: context.message && context.message.element && context.message.element.ownerDocument || null,
                settings: context.unifiedSettings || null,
            }, resolveActiveProviders(context.providers, builtinProviders));
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
            const imageApi = unifiedSettings.imageApi || unifiedSettings.bridge && unifiedSettings.bridge.imageApi || {};
            const currentState = context.imageState || await this.collect({ ...context, currentIndex, providers: context.providers });

            if (String(imageApi.mode || '').trim() === 'nai') {
                if (!imageGenerator) {
                    return { ok: false, reason: 'provider-not-enabled', imageState: currentState };
                }
                const generated = await imageGenerator({
                    prompt: String(context.prompt || '').trim(),
                    message: context.message || null,
                    messageId,
                    imageIndex: currentIndex,
                    unifiedSettings,
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

function resolveActiveProviders(explicitProviders, builtinProviders) {
    if (Array.isArray(explicitProviders) && explicitProviders.length) {
        return normalizeProviders(explicitProviders);
    }
    return builtinProviders;
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
    return findScopedRegenerateButton(context && context.message, imageIndex);
}

function findScopedRegenerateButton(message, imageIndex) {
    const targetIndex = normalizeIndex(imageIndex);
    const roots = [];
    const element = message && message.element;
    if (element) roots.push(element);
    if (element && typeof element.querySelector === 'function') {
        try {
            const textRoot = element.querySelector('.mes_text');
            if (textRoot && !roots.includes(textRoot)) roots.push(textRoot);
        } catch (error) {
            // Ignore host DOM shim selector failures.
        }
    }
    if (!roots.length) return null;

    const selectors = [
        'button.image-tag-button, button[class*="image-tag-button"], button[class*="st-chatu8-image"]',
        '.tsp-regenerate-btn, .tsp-inline-gen-btn',
    ];
    const buttons = [];
    const seen = new Set();

    for (const selector of selectors) {
        for (const root of roots) {
            if (!root || typeof root.querySelectorAll !== 'function') continue;
            let matches = [];
            try {
                matches = Array.from(root.querySelectorAll(selector));
            } catch (error) {
                matches = [];
            }
            for (const button of matches) {
                if (!button || seen.has(button)) continue;
                seen.add(button);
                buttons.push(button);
            }
        }
    }

    return buttons[targetIndex] || null;
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
