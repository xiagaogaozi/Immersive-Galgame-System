import { getOwnerWindow } from './reader-dom-utils.js';
import { clampNumber } from './reader-value-utils.js';

export function applyReaderModeRuntime(root, snapshot, current, ctx = {}) {
    if (current.runtime && current.runtime.mode === snapshot.mode && current.runtime.root === root) {
        return;
    }
    const prevMode = current.runtime && current.runtime.mode;
    if (prevMode === 'fullscreen' && snapshot.mode !== 'fullscreen') {
        exitDocumentFullscreen(current.runtime.doc);
    }
    clearReaderModeRuntime(current);
    const win = getOwnerWindow(root);
    const doc = root && root.ownerDocument;
    const runtime = {
        cleanup: [],
        mode: snapshot.mode,
        win,
        doc,
        root,
    };
    current.runtime = runtime;

    if (snapshot.mode === 'pc' || snapshot.mode === 'mobile') {
        applyInlineReaderRuntime(root, snapshot.mode, runtime, current);
        return;
    }
    if (snapshot.mode === 'web') {
        applyWebReaderRuntime(root, runtime);
        return;
    }
    if (snapshot.mode === 'fullscreen') {
        applyFullscreenReaderRuntime(root, current, runtime, ctx);
    }
}

export function clearReaderModeRuntime(current) {
    const runtime = current && current.runtime;
    if (!runtime || !Array.isArray(runtime.cleanup)) return;
    while (runtime.cleanup.length) {
        const fn = runtime.cleanup.pop();
        try {
            fn();
        } catch (error) {
            // Best-effort cleanup.
        }
    }
    current.runtime = null;
}

export function addRuntimeCleanup(runtime, fn) {
    if (runtime && typeof fn === 'function') runtime.cleanup.push(fn);
}

function applyInlineReaderRuntime(root, mode, runtime, current) {
    const win = runtime.win || {};
    const doc = runtime.doc || {};
    const floatingState = current && current.floatingState
        ? current.floatingState
        : { dragged: false, left: null, top: null };
    let suppressTimer = null;
    root.style.top = 'auto';
    root.style.right = 'auto';
    root.style.left = '50%';
    root.style.bottom = '24px';
    root.style.transform = 'translateX(-50%)';
    root.style.boxSizing = 'border-box';
    root.style.zIndex = '2147483000';
    root.style.width = mode === 'pc' ? 'min(900px,calc(100vw - 32px))' : 'min(480px,calc(100vw - 32px))';
    root.style.height = mode === 'pc' ? 'min(540px,calc(100dvh - 32px))' : 'min(680px,calc(100dvh - 32px))';
    root.style.borderRadius = mode === 'pc' ? '18px' : '22px';
    root.style.boxShadow = '0 20px 64px rgba(0,0,0,0.42)';
    root.style.overflow = 'hidden';

    let scheduled = false;
    const clamp = () => {
        scheduled = false;
        const viewport = getInlineViewportMetrics(win, doc);
        const designWidth = mode === 'pc' ? 900 : 480;
        const designHeight = mode === 'pc' ? 540 : 680;
        const sideGap = 16;
        const bottomGap = 24;
        const minSize = 240;
        const minExtremeSize = 180;
        const safeWidth = Math.max(minSize, (viewport.width || (designWidth + sideGap * 2)) - sideGap * 2);
        const safeHeight = Math.max(minSize, (viewport.height || (designHeight + sideGap * 2)) - sideGap * 2);
        let targetWidth = Math.min(designWidth, safeWidth);
        let targetHeight = Math.min(designHeight, safeHeight);
        const availableHeight = (viewport.height || (targetHeight + sideGap + bottomGap)) - sideGap - bottomGap;
        if (availableHeight < targetHeight) {
            targetHeight = Math.max(minExtremeSize, Math.min(targetHeight, availableHeight));
        }
        const minLeft = viewport.left + 8;
        const minTop = viewport.top + 8;
        const maxLeft = Math.max(minLeft, viewport.right - targetWidth - 8);
        const maxTop = Math.max(minTop, viewport.bottom - targetHeight - 8);
        const defaultLeft = Math.round(viewport.left + (viewport.width || targetWidth) / 2);
        let targetLeft = defaultLeft;
        let targetTop = viewport.top + (viewport.height || (targetHeight + bottomGap)) - bottomGap - targetHeight;
        if (targetTop < minTop) targetTop = minTop;
        if (maxTop >= minTop && targetTop > maxTop) targetTop = maxTop;
        root.style.maxWidth = `${safeWidth}px`;
        root.style.maxHeight = `${safeHeight}px`;
        root.style.width = `${targetWidth}px`;
        root.style.height = `${targetHeight}px`;
        if (floatingState.dragged && Number.isFinite(floatingState.left) && Number.isFinite(floatingState.top)) {
            targetLeft = clampNumber(floatingState.left, minLeft, maxLeft);
            targetTop = clampNumber(floatingState.top, minTop, maxTop);
            floatingState.left = targetLeft;
            floatingState.top = targetTop;
            root.style.left = `${Math.round(targetLeft)}px`;
            root.style.top = `${Math.round(targetTop)}px`;
            root.style.right = 'auto';
            root.style.bottom = 'auto';
            root.style.transform = 'none';
            return;
        }
        root.style.left = `${defaultLeft}px`;
        root.style.top = `${Math.round(targetTop)}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transform = 'translateX(-50%)';
    };
    const schedule = () => {
        if (scheduled) return;
        scheduled = true;
        const raf = typeof win.requestAnimationFrame === 'function'
            ? win.requestAnimationFrame.bind(win)
            : null;
        if (raf) {
            raf(clamp);
        } else {
            const setter = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
            setter(clamp, 16);
        }
    };

    clamp();
    schedule();
    installFloatingDragRuntime(root, runtime, current, floatingState, () => {
        if (suppressTimer != null) {
            const clearer = typeof win.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout;
            clearer(suppressTimer);
        }
        current.dragSuppressClick = true;
        runtime.dragSuppressClick = true;
        const setter = typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : setTimeout;
        suppressTimer = setter(() => {
            current.dragSuppressClick = false;
            runtime.dragSuppressClick = false;
            suppressTimer = null;
        }, 120);
    });
    addEventListenerWithCleanup(win, 'resize', schedule, runtime);
    addEventListenerWithCleanup(win, 'orientationchange', schedule, runtime);
    if (win.visualViewport) {
        addEventListenerWithCleanup(win.visualViewport, 'resize', schedule, runtime);
        addEventListenerWithCleanup(win.visualViewport, 'scroll', schedule, runtime);
    }
    addRuntimeCleanup(runtime, () => {
        if (suppressTimer != null) {
            const clearer = typeof win.clearTimeout === 'function' ? win.clearTimeout.bind(win) : clearTimeout;
            clearer(suppressTimer);
        }
    });
}

function installFloatingDragRuntime(root, runtime, current, floatingState, onSuppressClick) {
    if (!root || !runtime || !current) return;
    const layer = root.querySelector('#vn-click-layer');
    const doc = runtime.doc;
    if (!layer || !doc || typeof doc.addEventListener !== 'function') return;
    let active = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let pointerId = null;

    const onMove = (event) => {
        if (!active) return;
        const clientX = Number(event && event.clientX);
        const clientY = Number(event && event.clientY);
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        if (!dragging && Math.hypot(dx, dy) < 6) return;
        dragging = true;
        root.classList.add('is-dragging');
        if (event && event.cancelable && typeof event.preventDefault === 'function') event.preventDefault();
        const viewport = getInlineViewportMetrics(runtime.win || {}, doc);
        const minLeft = viewport.left + 8;
        const minTop = viewport.top + 8;
        const maxLeft = Math.max(minLeft, viewport.right - root.offsetWidth - 8);
        const maxTop = Math.max(minTop, viewport.bottom - root.offsetHeight - 8);
        const nextLeft = clampNumber(startLeft + dx, minLeft, maxLeft);
        const nextTop = clampNumber(startTop + dy, minTop, maxTop);
        floatingState.dragged = true;
        floatingState.left = nextLeft;
        floatingState.top = nextTop;
        runtime.dragged = true;
        root.style.left = `${Math.round(nextLeft)}px`;
        root.style.top = `${Math.round(nextTop)}px`;
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transform = 'none';
    };

    const onUp = () => {
        if (!active) return;
        active = false;
        try {
            if (pointerId !== null && typeof layer.releasePointerCapture === 'function') {
                layer.releasePointerCapture(pointerId);
            }
        } catch (error) {
            // Ignore missing pointer capture implementations.
        }
        if (typeof doc.removeEventListener === 'function') {
            doc.removeEventListener('pointermove', onMove);
            doc.removeEventListener('pointerup', onUp);
            doc.removeEventListener('pointercancel', onUp);
        }
        root.classList.remove('is-dragging');
        if (dragging && typeof onSuppressClick === 'function') onSuppressClick();
        dragging = false;
        pointerId = null;
    };

    layer.addEventListener('pointerdown', (event) => {
        if (event && event.button !== undefined && event.button !== 0) return;
        const clientX = Number(event && event.clientX);
        const clientY = Number(event && event.clientY);
        if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
        active = true;
        dragging = false;
        startX = clientX;
        startY = clientY;
        pointerId = event && event.pointerId !== undefined ? event.pointerId : null;
        const rect = typeof root.getBoundingClientRect === 'function'
            ? root.getBoundingClientRect()
            : { left: 0, top: 0 };
        startLeft = Number.isFinite(rect.left) ? rect.left : 0;
        startTop = Number.isFinite(rect.top) ? rect.top : 0;
        try {
            if (pointerId !== null && typeof layer.setPointerCapture === 'function') {
                layer.setPointerCapture(pointerId);
            }
        } catch (error) {
            // Ignore missing pointer capture implementations.
        }
        doc.addEventListener('pointermove', onMove);
        doc.addEventListener('pointerup', onUp);
        doc.addEventListener('pointercancel', onUp);
    });

    addRuntimeCleanup(runtime, () => {
        if (typeof doc.removeEventListener === 'function') {
            doc.removeEventListener('pointermove', onMove);
            doc.removeEventListener('pointerup', onUp);
            doc.removeEventListener('pointercancel', onUp);
        }
        root.classList.remove('is-dragging');
    });
}

function applyWebReaderRuntime(root, runtime) {
    const win = runtime.win || {};
    const doc = runtime.doc;
    if (!doc || !doc.body || !doc.documentElement) return;
    const savedScrollY = Number(win.scrollY) || 0;
    const savedBody = {
        overflow: doc.body.style.overflow || '',
        position: doc.body.style.position || '',
        width: doc.body.style.width || '',
        top: doc.body.style.top || '',
    };
    const savedHtmlOverflow = doc.documentElement.style.overflow || '';

    doc.body.style.overflow = 'hidden';
    doc.body.style.position = 'fixed';
    doc.body.style.width = '100%';
    doc.body.style.top = `-${savedScrollY}px`;
    doc.documentElement.style.overflow = 'hidden';

    const syncHeight = () => {
        const height = runtime.win && runtime.win.visualViewport && Number.isFinite(runtime.win.visualViewport.height)
            ? runtime.win.visualViewport.height
            : Number(runtime.win && runtime.win.innerHeight) || 0;
        if (height > 0) root.style.height = `${Math.round(height)}px`;
    };
    syncHeight();
    if (win.visualViewport) addEventListenerWithCleanup(win.visualViewport, 'resize', syncHeight, runtime);

    addRuntimeCleanup(runtime, () => {
        doc.body.style.overflow = savedBody.overflow;
        doc.body.style.position = savedBody.position;
        doc.body.style.width = savedBody.width;
        doc.body.style.top = savedBody.top;
        doc.documentElement.style.overflow = savedHtmlOverflow;
        if (typeof win.scrollTo === 'function') win.scrollTo(0, savedScrollY);
    });
}

function applyFullscreenReaderRuntime(root, current, runtime, ctx = {}) {
    const doc = runtime.doc;
    if (!doc) return;
    const target = doc.documentElement || doc.body;
    const request = target && (target.requestFullscreen || target.webkitRequestFullscreen);
    if (typeof request === 'function' && !doc.fullscreenElement && !doc.webkitFullscreenElement) {
        try {
            const result = request.call(target);
            if (result && typeof result.catch === 'function') result.catch(() => {});
        } catch (error) {
            // Ignore fullscreen failures in simulation.
        }
    }
}

export function exitDocumentFullscreen(doc) {
    if (!doc) return;
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if ((doc.fullscreenElement || doc.webkitFullscreenElement) && typeof exit === 'function') {
        try {
            const result = exit.call(doc);
            if (result && typeof result.catch === 'function') result.catch(() => {});
        } catch (error) {
            // Ignore exit failures.
        }
    }
}

function getInlineViewportMetrics(win, doc) {
    const viewport = win && win.visualViewport;
    const docEl = doc && doc.documentElement ? doc.documentElement : {};
    const fallbackWidth = Math.round(Number(win && win.innerWidth) || Number(docEl.clientWidth) || 0);
    const fallbackHeight = Math.round(Number(win && win.innerHeight) || Number(docEl.clientHeight) || 0);
    let left = Math.round(viewport && Number.isFinite(viewport.offsetLeft) ? viewport.offsetLeft : 0);
    let top = Math.round(viewport && Number.isFinite(viewport.offsetTop) ? viewport.offsetTop : 0);
    let width = Math.round(viewport && Number.isFinite(viewport.width) ? viewport.width : 0);
    let height = Math.round(viewport && Number.isFinite(viewport.height) ? viewport.height : 0);
    if (width < 240 && fallbackWidth >= 240) {
        width = fallbackWidth;
        left = 0;
    }
    if (height < 240 && fallbackHeight >= 240) {
        height = fallbackHeight;
        top = 0;
    }
    width = width || fallbackWidth || 320;
    height = height || fallbackHeight || 480;
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
    };
}

function addEventListenerWithCleanup(target, type, handler, runtime) {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener(type, handler);
    addRuntimeCleanup(runtime, () => {
        if (typeof target.removeEventListener === 'function') {
            target.removeEventListener(type, handler);
        }
    });
}
