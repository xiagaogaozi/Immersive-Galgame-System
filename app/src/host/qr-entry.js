import { getTavernHelper } from './tavern-helper-adapter.js';

// QR（快速回复）入口：用 JS-Slash-Runner 的脚本按钮 API 在 Quick Reply 按钮栏附近渲染一个按钮。
// 依据：appendInexistentScriptButtons([{name,visible}]) 追加按钮，eventOn(getButtonEvent(name), fn)
// 监听点击。这些函数挂在 window.TavernHelper 上，仅在脚本运行上下文可用，需做存在性守卫。
export function createQrEntry(options = {}) {
    const globalObject = options.global || globalThis.window || globalThis;
    const label = options.label || '沉浸式Galgame系统';
    const open = typeof options.open === 'function' ? options.open : null;
    const resolveMode = typeof options.resolveMode === 'function' ? options.resolveMode : () => 'pc';
    const notify = typeof options.notify === 'function' ? options.notify : () => {};

    let attached = false;
    let listenerHandle = null;

    return { attach, destroy, isSupported, getState };

    function isSupported() {
        const helper = getTavernHelper(globalObject);
        return Boolean(
            helper
            && typeof helper.appendInexistentScriptButtons === 'function'
            && typeof helper.getButtonEvent === 'function'
            && typeof helper.eventOn === 'function',
        );
    }

    function attach() {
        if (attached) return { ok: true, reason: 'already-attached' };
        const helper = getTavernHelper(globalObject);
        if (!isSupported()) {
            return { ok: false, reason: 'qr-script-buttons-unavailable' };
        }
        try {
            helper.appendInexistentScriptButtons([{ name: label, visible: true }]);
            const handle = helper.eventOn(helper.getButtonEvent(label), handleClick);
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
        const helper = getTavernHelper(globalObject);
        if (helper && typeof helper.getScriptButtons === 'function' && typeof helper.replaceScriptButtons === 'function') {
            try {
                const remaining = helper.getScriptButtons().filter((button) => button && button.name !== label);
                helper.replaceScriptButtons(remaining);
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
