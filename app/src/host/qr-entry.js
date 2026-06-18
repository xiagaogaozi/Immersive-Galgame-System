import { getTavernHelper } from './tavern-helper-adapter.js';

// QR（快速回复）入口：用 JS-Slash-Runner 的脚本按钮 API 在快速回复栏注册一个按钮。
// 依据：appendInexistentScriptButtons([{name,visible}]) 追加按钮，eventOn(getButtonEvent(name), fn) 监听点击。
// 这些函数可能挂在 window.TavernHelper、顶层 window 全局，或 SillyTavern context 上，运行时按多源解析。
const SCRIPT_BUTTON_FNS = ['appendInexistentScriptButtons', 'getButtonEvent', 'eventOn', 'getScriptButtons', 'replaceScriptButtons'];

export function createQrEntry(options = {}) {
    const globalObject = options.global || globalThis.window || globalThis;
    const label = options.label || '沉浸式Galgame系统';
    const open = typeof options.open === 'function' ? options.open : null;
    const resolveMode = typeof options.resolveMode === 'function' ? options.resolveMode : () => 'pc';
    const notify = typeof options.notify === 'function' ? options.notify : () => {};

    let attached = false;
    let listenerHandle = null;

    return { attach, destroy, isSupported, getState };

    // 在 TavernHelper / 顶层 window / SillyTavern context 三处查找脚本按钮 API 所在的对象。
    function resolveApi() {
        const candidates = [];
        const helper = getTavernHelper(globalObject);
        if (helper) candidates.push(helper);
        try {
            const top = globalObject && (globalObject.top || globalObject);
            if (top) candidates.push(top);
        } catch (error) { /* ignore */ }
        if (globalObject) candidates.push(globalObject);
        try {
            const ctx = globalObject && globalObject.SillyTavern && typeof globalObject.SillyTavern.getContext === 'function'
                ? globalObject.SillyTavern.getContext()
                : null;
            if (ctx) candidates.push(ctx);
        } catch (error) { /* ignore */ }
        for (const obj of candidates) {
            if (obj && SCRIPT_BUTTON_FNS.slice(0, 3).every((k) => typeof obj[k] === 'function')) {
                return obj;
            }
        }
        return null;
    }

    function isSupported() {
        return Boolean(resolveApi());
    }

    function attach() {
        if (attached) return { ok: true, reason: 'already-attached' };
        const api = resolveApi();
        if (!api) return { ok: false, reason: 'qr-script-buttons-unavailable' };
        try {
            api.appendInexistentScriptButtons([{ name: label, visible: true }]);
            const handle = api.eventOn(api.getButtonEvent(label), handleClick);
            listenerHandle = handle && typeof handle.stop === 'function' ? handle : null;
            attached = true;
            return { ok: true };
        } catch (error) {
            return { ok: false, reason: 'qr-attach-failed', error: error && error.message || String(error) };
        }
    }

    function destroy() {
        attached = false;
        if (listenerHandle && typeof listenerHandle.stop === 'function') {
            try { listenerHandle.stop(); } catch (error) { /* ignore */ }
        }
        listenerHandle = null;
        const api = resolveApi();
        if (api && typeof api.getScriptButtons === 'function' && typeof api.replaceScriptButtons === 'function') {
            try {
                const remaining = api.getScriptButtons().filter((button) => button && button.name !== label);
                api.replaceScriptButtons(remaining);
            } catch (error) { /* ignore */ }
        }
        return { ok: true, reason: 'destroyed' };
    }

    function handleClick() {
        if (!open) {
            notify('IGS 入口尚未绑定打开函数。', 'error');
            return;
        }
        let mode = 'pc';
        try { mode = resolveMode() || 'pc'; } catch (error) { mode = 'pc'; }
        Promise.resolve(open(mode)).then((resolved) => {
            if (!resolved || resolved.ok === false) {
                notify(`IGS 阅读器打开失败：${resolved && resolved.reason || 'unknown'}`, 'error');
            }
        }).catch((error) => {
            notify(`IGS 阅读器打开失败：${error && error.message || String(error)}`, 'error');
        });
    }

    function getState() {
        return { attached, supported: isSupported(), label };
    }
}
