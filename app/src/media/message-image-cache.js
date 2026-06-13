export function createMessageImageCache(store = new Map()) {
    return {
        get(messageId) {
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return null;
            return cloneData(store.get(normalizedId) || null);
        },

        remember(messageId, images, options = {}) {
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) {
                return { ok: false, reason: 'invalid-message-id', messageId };
            }
            const nextImages = normalizeImages(images);
            const current = store.get(normalizedId);
            const merged = options.merge === true && current
                ? uniqueImages([...(current.images || []), ...nextImages])
                : nextImages;
            const entry = createEntry(normalizedId, merged);
            store.set(normalizedId, entry);
            return { ok: true, entry: cloneData(entry) };
        },

        clearMessage(messageId) {
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return { ok: false, reason: 'invalid-message-id', messageId };
            return { ok: store.delete(normalizedId), messageId: normalizedId };
        },

        clear() {
            store.clear();
            return { ok: true };
        },
    };
}

function createEntry(messageId, images) {
    const normalizedImages = normalizeImages(images);
    return {
        messageId,
        images: normalizedImages,
        count: normalizedImages.length,
        signature: createImageSignature(normalizedImages),
    };
}

function normalizeImages(images) {
    const source = Array.isArray(images) ? images : [];
    return uniqueImages(source.map((image) => {
        if (!image || typeof image !== 'object') return null;
        const url = String(image.url || '').trim();
        if (!url) return null;
        return {
            url,
            providerId: String(image.providerId || '').trim(),
            source: String(image.source || '').trim(),
            filename: String(image.filename || '').trim(),
        };
    }).filter(Boolean));
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

function createImageSignature(images) {
    return uniqueImages(images).map((image) => image.url).join('\n');
}

function normalizeMessageId(value) {
    const id = Number(value);
    if (!Number.isFinite(id) || id < 0) return null;
    return id;
}

function cloneData(value) {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map(cloneData);
    if (typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneData(item)]));
    }
    return value;
}
