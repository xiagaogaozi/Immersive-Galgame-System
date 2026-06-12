export function createTavernHelperAdapter(globalObject = globalThis.window || globalThis) {
    const helper = globalObject && globalObject.TavernHelper;

    return {
        async getLastMessageId() {
            if (!helper) return null;
            return getLastMessageId(helper);
        },

        async getCurrentMessage() {
            if (!helper) return null;
            const lastId = getLastMessageId(helper);
            const messages = getChatMessages(helper, 0, lastId);
            return normalizeMessage(messages[messages.length - 1], lastId);
        },

        async getMessageById(messageId) {
            if (!helper) return null;
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return null;
            const direct = getChatMessages(helper, normalizedId, normalizedId).find((message) => {
                return normalizeMessageId(message && message.id) === normalizedId
                    || normalizeMessageId(message && message.message_id) === normalizedId;
            });
            if (direct) return normalizeMessage(direct, normalizedId);

            const lastId = getLastMessageId(helper);
            const messages = getChatMessages(helper, 0, lastId);
            const fallback = messages.find((message) => {
                return normalizeMessageId(message && message.id) === normalizedId
                    || normalizeMessageId(message && message.message_id) === normalizedId;
            });
            return normalizeMessage(fallback, normalizedId);
        },

        async typeAndSend(text) {
            if (!helper) return { ok: false, reason: 'missing-tavern-helper' };
            if (typeof helper.typeAndSend === 'function') {
                await helper.typeAndSend(text);
                return { ok: true };
            }
            if (typeof helper.setInputText === 'function' && typeof helper.send === 'function') {
                await helper.setInputText(text);
                await helper.send();
                return { ok: true };
            }
            return { ok: false, reason: 'missing-send-api' };
        },
    };
}

function getLastMessageId(helper) {
    if (typeof helper.getLastMessageId === 'function') {
        return helper.getLastMessageId();
    }
    return null;
}

function getChatMessages(helper, startId, endId) {
    if (typeof helper.getChatMessages !== 'function') return [];
    const safeStart = normalizeMessageId(startId) ?? 0;
    const safeEnd = normalizeMessageId(endId) ?? safeStart;
    const range = `${Math.min(safeStart, safeEnd)}-${Math.max(safeStart, safeEnd)}`;
    const messages = helper.getChatMessages(range, { include_swipes: false });
    return Array.isArray(messages) ? messages : [];
}

function normalizeMessage(message, fallbackId) {
    if (typeof message === 'string') return { id: fallbackId, text: message };
    if (!message || typeof message !== 'object') return null;
    return {
        id: message.id == null ? fallbackId : message.id,
        text: message.text || message.message || message.content || message.mes || '',
        raw: message,
    };
}

function normalizeMessageId(value) {
    const id = Number(value);
    if (!Number.isFinite(id) || id < 0) return null;
    return id;
}
