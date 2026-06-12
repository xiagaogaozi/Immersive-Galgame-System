export const chamiProvider = Object.freeze({
    id: 'builtin.chami',
    label: 'chami_tavern-scene-plugin',
    type: 'image-provider',
    builtin: true,
    detachable: true,
    defaultPresetType: 'image-provider-preset',
    permissions: [],
    async detect(context) {
        const root = context && context.root;
        if (!root || typeof root.querySelector !== 'function') return false;
        return !!root.querySelector('.tsp-generated-image, .tsp-inline-image, .tsp-image-slot img, img[src*="tsp-images"], [data-image-id], [data-location-hash]');
    },
    async generate() {
        return { ok: false, reason: 'external-provider' };
    },
    async poll(task) {
        return task || null;
    },
    extractImages(messageContext) {
        const root = messageContext && messageContext.root;
        if (!root || typeof root.querySelectorAll !== 'function') return [];
        return Array.from(root.querySelectorAll('.tsp-generated-image, .tsp-inline-image, .tsp-image-slot img, img[src*="tsp-images"], [data-image-id] img, img[data-image-id], [data-location-hash] img, img[data-location-hash]'))
            .map((img) => ({ url: img.currentSrc || img.src, providerId: 'builtin.chami' }))
            .filter((image) => image.url);
    },
});
