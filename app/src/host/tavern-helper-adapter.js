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
            const normalizedMessages = getNormalizedMessages(helper, globalObject);
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

        async listMessages() {
            if (!helper) return [];
            return getNormalizedMessages(helper, globalObject);
        },

        async getAdjacentMessage(messageId, delta = 1) {
            if (!helper) return null;
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return null;
            const step = Number(delta) < 0 ? -1 : 1;
            const messages = getNormalizedMessages(helper, globalObject).filter(isTurnCandidate);
            const currentIndex = messages.findIndex((message) => message.id === normalizedId);
            if (currentIndex < 0) return null;
            return messages[currentIndex + step] || null;
        },

        async jumpToMessage(messageId) {
            if (!helper) return { ok: false, reason: 'missing-tavern-helper' };
            const normalizedId = normalizeMessageId(messageId);
            if (normalizedId == null) return { ok: false, reason: 'invalid-message-id', messageId };
            if (typeof helper.triggerSlash !== 'function') {
                return { ok: false, reason: 'missing-trigger-slash', messageId: normalizedId };
            }
            await helper.triggerSlash(`/chat-jump ${normalizedId}`);
            return { ok: true, messageId: normalizedId };
        },

        async findRegenerateButton(messageId, imageIndex = 0) {
            const message = await this.getMessageById(messageId);
            if (!message) return null;
            return findMessageRegenerateButton(message, imageIndex);
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
    const element = resolveMessageElement(message, id, domMessageMap);
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

function getNormalizedMessages(helper, globalObject) {
    const lastId = getLastMessageId(helper);
    const messages = getChatMessages(helper, 0, lastId);
    const domMessageMap = createDomMessageMap(globalObject);
    return messages
        .map((message) => normalizeMessage(message, lastId, domMessageMap))
        .filter(Boolean)
        .sort((left, right) => (left.id ?? 0) - (right.id ?? 0));
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
        return isTurnCandidate(message);
    });
    return readable[readable.length - 1] || null;
}

function isTurnCandidate(message) {
    return Boolean(
        message
        && !message.isSystem
        && !message.isHidden
        && !message.isUser,
    );
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

function findMessageRegenerateButton(message, imageIndex) {
    const targetIndex = Math.max(0, Math.floor(Number(imageIndex) || 0));
    const roots = getMessageScopedRoots(message);
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

function getMessageScopedRoots(message) {
    const roots = [];
    const addRoot = (root) => {
        if (!root || roots.includes(root)) return;
        roots.push(root);
    };

    const element = message && message.element;
    addRoot(element);

    if (element && typeof element.querySelector === 'function') {
        try {
            addRoot(element.querySelector('.mes_text'));
        } catch (error) {
            // Ignore bad selectors in host shims.
        }
    }

    return roots;
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

function resolveMessageElement(message, id, domMessageMap) {
    const direct = getMessageDomElement(message);
    if (direct) return direct;
    return id != null ? domMessageMap.get(id) || null : null;
}

function getMessageDomElement(message) {
    if (!message || typeof message !== 'object') return null;
    if (isDomLikeMessageElement(message.element)) return message.element;
    return isDomLikeMessageElement(message) ? message : null;
}

function isDomLikeMessageElement(value) {
    return Boolean(
        value
        && typeof value === 'object'
        && typeof value.getAttribute === 'function',
    );
}

function isUserMessage(message) {
    const element = getMessageDomElement(message);
    return Boolean(
        message && (
            isTruthyFlag(message.is_user)
            || isTruthyFlag(message.isUser)
            || isTruthyFlag(message.user)
            || message.role === 'user'
            || (element && element.getAttribute('is_user') === 'true')
        ),
    );
}

function isSystemMessage(message) {
    const element = getMessageDomElement(message);
    return Boolean(
        message && (
            isTruthyFlag(message.is_system)
            || isTruthyFlag(message.isSystem)
            || isTruthyFlag(message.system)
            || (element && element.getAttribute('is_system') === 'true')
        ),
    );
}

function isHiddenMessage(message) {
    const element = getMessageDomElement(message);
    return Boolean(
        message && (
            isTruthyFlag(message.is_hidden)
            || isTruthyFlag(message.isHidden)
            || isTruthyFlag(message.hidden)
            || (element && element.getAttribute('is_hidden') === 'true')
        ),
    );
}

function isTruthyFlag(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizeText(value) {
    return String(value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
