const INJECTION_ID = 'vn-scene-assets-format-rule';

export function createPromptInjector(globalObject) {
    const root = globalObject || globalThis.window || globalThis;
    let handle = null;

    function getTavernHelper() {
        try {
            if (root.TavernHelper) return root.TavernHelper;
            if (root.top && root.top.TavernHelper) return root.top.TavernHelper;
        } catch (error) { /* cross-origin */ }
        return null;
    }

    function getContext() {
        try {
            if (root.SillyTavern && typeof root.SillyTavern.getContext === 'function') {
                return root.SillyTavern.getContext();
            }
            if (typeof root.getContext === 'function') return root.getContext();
        } catch (error) { /* */ }
        return null;
    }

    function inject(content) {
        clear();
        if (!content) return { ok: false, reason: 'empty-content' };

        const helper = getTavernHelper();
        if (helper && typeof helper.injectPrompts === 'function') {
            try {
                handle = helper.injectPrompts([{
                    id: INJECTION_ID,
                    position: 'in_chat',
                    depth: 0,
                    role: 'system',
                    content,
                    should_scan: false,
                }]);
                return { ok: true, method: 'tavern-helper' };
            } catch (error) { /* fall through */ }
        }

        if (typeof root.injectPrompts === 'function') {
            try {
                handle = root.injectPrompts([{
                    id: INJECTION_ID,
                    position: 'in_chat',
                    depth: 0,
                    role: 'system',
                    content,
                    should_scan: false,
                }]);
                return { ok: true, method: 'global-inject' };
            } catch (error) { /* fall through */ }
        }

        const context = getContext();
        if (context && typeof context.setExtensionPrompt === 'function') {
            try {
                context.setExtensionPrompt(INJECTION_ID, content, 0, 0, false, 0);
                return { ok: true, method: 'extension-prompt' };
            } catch (error) { /* fall through */ }
        }

        return { ok: false, reason: 'no-injection-api' };
    }

    function clear() {
        if (handle && typeof handle.uninject === 'function') {
            try { handle.uninject(); } catch (error) { /* */ }
            handle = null;
            return;
        }
        handle = null;
        const context = getContext();
        if (context && typeof context.setExtensionPrompt === 'function') {
            try { context.setExtensionPrompt(INJECTION_ID, '', 0, 0, false, 0); } catch (error) { /* */ }
        }
    }

    function isActive() {
        return handle !== null;
    }

    return { inject, clear, isActive };
}
