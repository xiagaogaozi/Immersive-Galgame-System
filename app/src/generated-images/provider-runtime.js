import { chamiProvider } from './providers/chami-provider.js';
import { naiProvider } from './providers/nai-provider.js';
import { stChatu8Provider } from './providers/st-chatu8-provider.js';

const BUILTIN_IMAGE_PROVIDERS = Object.freeze([
    stChatu8Provider,
    chamiProvider,
    naiProvider,
]);

export function listBuiltinImageProviders() {
    return BUILTIN_IMAGE_PROVIDERS.slice();
}

export async function collectProviderImages(messageContext = {}, providers = BUILTIN_IMAGE_PROVIDERS) {
    const activeProviders = normalizeProviders(providers);
    const images = [];

    for (const provider of activeProviders) {
        if (!provider || typeof provider.extractImages !== 'function') continue;

        let detected = true;
        if (typeof provider.detect === 'function') {
            try {
                detected = await provider.detect(messageContext);
            } catch (error) {
                detected = false;
            }
        }
        if (!detected) continue;

        let extracted = [];
        try {
            extracted = provider.extractImages(messageContext) || [];
        } catch (error) {
            extracted = [];
        }
        for (const image of Array.isArray(extracted) ? extracted : []) {
            const url = String(image && image.url || '').trim();
            if (!url) continue;
            images.push({
                url,
                providerId: String(image.providerId || provider.id || '').trim(),
                source: String(image.source || 'provider-dom').trim(),
                filename: String(image.filename || '').trim(),
            });
        }
    }

    return uniqueImages(images);
}

function normalizeProviders(providers) {
    const source = Array.isArray(providers) ? providers : [];
    const output = [];
    const seen = new Set();

    for (const provider of source) {
        if (!provider || typeof provider !== 'object') continue;
        const id = String(provider.id || '').trim();
        const key = id || `${provider.label || 'provider'}:${output.length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        output.push(provider);
    }

    return output;
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
