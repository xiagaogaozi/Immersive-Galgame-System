export const stChatu8Provider = Object.freeze({
    id: 'builtin.st-chatu8',
    label: 'st-chatu8',
    type: 'image-provider',
    builtin: true,
    detachable: true,
    defaultPresetType: 'image-provider-preset',
    permissions: [],
    async detect(context) {
        const root = context && context.root;
        if (!root || typeof root.querySelector !== 'function') return false;
        return !!root.querySelector('img.st-chatu8-image-tag-image, [class*="st-chatu8"] img, [class*="chatu8"] img');
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
        return Array.from(root.querySelectorAll('img.st-chatu8-image-tag-image, [class*="st-chatu8"] img, [class*="chatu8"] img'))
            .map((img) => ({ url: img.currentSrc || img.src, providerId: 'builtin.st-chatu8' }))
            .filter((image) => image.url);
    },
});
