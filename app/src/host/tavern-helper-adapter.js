import {
    getMessagePrimaryText,
    getVisibleMessageTextFromElement,
    looksLikeHostUiHtml,
} from '../scene/message-source.js';

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
            const domMessageMap = createDomMessageMap(globalObject);
            const normalizedMessages = messages
                .map((message) => normalizeMessage(message, lastId, domMessageMap))
                .filter(Boolean);
            return pickCurrentMessage(normalizedMessages) || normalizedMessages[normalizedMessages.length - 1] || null;
        },

        async getMessageById(messageId) {
            if (!helper) return null;
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return null;
            const domMessageMap = createDomMessageMap(globalObject);
            const direct = getChatMessages(helper, normalizedId, normalizedId).find((message) => {
                return normalizeMessageId(message && message.id) === normalizedId
                    || normalizeMessageId(message && message.message_id) === normalizedId;
            });
            if (direct) return normalizeMessage(direct, normalizedId, domMessageMap);

            const lastId = getLastMessageId(helper);
            const messages = getChatMessages(helper, 0, lastId);
            const fallback = messages.find((message) => {
                return normalizeMessageId(message && message.id) === normalizedId
                    || normalizeMessageId(message && message.message_id) === normalizedId;
            });
            return normalizeMessage(fallback, normalizedId, domMessageMap);
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

function normalizeMessage(message, fallbackId, domMessageMap = new Map()) {
    if (typeof message === 'string') return { id: fallbackId, text: message, rawHtml: message, raw: message };
    if (!message || typeof message !== 'object') return null;
    const id = resolveMessageId(message, fallbackId);
    const element = id != null ? domMessageMap.get(id) || null : null;
    const rawText = getMessagePrimaryText(message);
    const visibleText = normalizeText(
        message.visibleText
        || message.displayText
        || message.plainText
        || getVisibleMessageTextFromElement(element),
    );
    return {
        id,
        text: rawText,
        rawHtml: rawText,
        visibleText,
        looksLikeHostUiHtml: looksLikeHostUiHtml(rawText),
        element,
        isUser: isUserMessage(message),
        isSystem: isSystemMessage(message),
        isHidden: isHiddenMessage(message),
        raw: message,
    };
}

function normalizeMessageId(value) {
    const id = Number(value);
    if (!Number.isFinite(id) || id < 0) return null;
    return id;
}

function resolveMessageId(message, fallbackId) {
    return normalizeMessageId(message && (message.id ?? message.message_id ?? fallbackId));
}

function pickCurrentMessage(messages) {
    const readable = messages.filter((message) => {
        return message
            && !message.isSystem
            && !message.isHidden
            && !message.isUser;
    });
    return readable[readable.length - 1] || null;
}

function createDomMessageMap(globalObject) {
    const docs = getCandidateDocuments(globalObject);
    const map = new Map();

    for (const doc of docs) {
        const nodes = safeQueryAll(doc, '#chat .mes, .mes');
        for (const node of nodes) {
            const id = getElementMessageId(node);
            if (id == null || map.has(id)) continue;
            map.set(id, node);
        }
    }

    return map;
}

function getCandidateDocuments(globalObject) {
    const docs = [];
    const addDoc = (doc) => {
        if (doc && !docs.includes(doc)) docs.push(doc);
    };

    addDoc(safeDocument(globalObject));
    try {
        addDoc(safeDocument(globalObject.top));
    } catch (error) {
        // Cross-origin top windows are ignored.
    }
    if (typeof document !== 'undefined') addDoc(document);
    return docs;
}

function safeDocument(target) {
    try {
        return target && target.document || null;
    } catch (error) {
        return null;
    }
}

function safeQueryAll(doc, selector) {
    try {
        return doc && typeof doc.querySelectorAll === 'function'
            ? Array.from(doc.querySelectorAll(selector))
            : [];
    } catch (error) {
        return [];
    }
}

function getElementMessageId(element) {
    if (!element || typeof element.getAttribute !== 'function') return null;
    return normalizeMessageId(
        element.getAttribute('mesid')
        ?? element.getAttribute('data-mesid')
        ?? element.getAttribute('data-message-id')
        ?? element.getAttribute('data-id')
        ?? element.id,
    );
}

function isUserMessage(message) {
    return Boolean(
        message && (
            message.is_user === true
            || message.isUser === true
            || message.user === true
        ),
    );
}

function isSystemMessage(message) {
    return Boolean(
        message && (
            message.is_system === true
            || message.isSystem === true
            || message.system === true
        ),
    );
}

function isHiddenMessage(message) {
    return Boolean(
        message && (
            message.is_hidden === true
            || message.isHidden === true
            || message.hidden === true
        ),
    );
}

function normalizeText(value) {
    return String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
