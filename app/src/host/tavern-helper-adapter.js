export function createTavernHelperAdapter(globalObject = globalThis.window || globalThis) {
    const helper = globalObject && globalObject.TavernHelper;

    return {
        async getCurrentMessage() {
            if (!helper) return null;
            const lastId = getLastMessageId(helper);
            const messages = getChatMessages(helper, lastId);
            return normalizeMessage(messages[messages.length - 1], lastId);
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

function getChatMessages(helper, lastId) {
    if (typeof helper.getChatMessages !== 'function') return [];
    const range = lastId == null ? '0-0' : `0-${lastId}`;
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
