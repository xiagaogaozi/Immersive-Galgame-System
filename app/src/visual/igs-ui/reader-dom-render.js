import {
    ORIGINAL_READER_ICONS,
    ORIGINAL_READER_TOOLBAR_BUTTONS,
} from './original-reader-source.js';
import { TOOLBAR_ACTIONS } from './reader-host-constants.js';
import {
    ensureImageLoadingSpinner,
    ensureImageEmptyPlaceholder,
    getOwnerWindow,
    readElementHeight,
    readElementWidth,
    removeImageEmptyPlaceholder,
    removeImageLoadingSpinner,
} from './reader-dom-utils.js';
import { computeLineHeight, normalizeOpacity, igsDebug } from './reader-value-utils.js';
import {
    renderDialogueHtml,
    resolveActiveTheme,
    resolveSpriteLayout,
} from './settings-normalize.js';
import { applyReaderModeRuntime } from './reader-runtime.js';

export function createReaderButton(doc, id, title, html) {
    const button = doc.createElement('button');
    button.id = `igs-btn-${id}`;
    button.className = 'igs-icon-btn';
    button.type = 'button';
    button.setAttribute('data-act', id);
    button.setAttribute('title', title);
    button.innerHTML = html;
    return button;
}

export function buildFallbackReaderOverlay(doc) {
    if (!doc || typeof doc.createElement !== 'function') return null;
    const overlay = doc.createElement('div');
    overlay.id = 'igs-overlay';

    const bgBlur = doc.createElement('div');
    bgBlur.id = 'igs-bg-blur';
    overlay.appendChild(bgBlur);

    const bg = doc.createElement('div');
    bg.id = 'igs-bg';
    overlay.appendChild(bg);

    const sprite = doc.createElement('div');
    sprite.id = 'igs-sprite';
    overlay.appendChild(sprite);

    const clickLayer = doc.createElement('div');
    clickLayer.id = 'igs-click-layer';
    overlay.appendChild(clickLayer);

    const dialog = doc.createElement('div');
    dialog.id = 'igs-dialog';
    dialog.className = 'igs-dialog';
    overlay.appendChild(dialog);

    const ctrlBar = doc.createElement('div');
    ctrlBar.id = 'igs-ctrl-bar';
    ctrlBar.className = 'igs-ctrl-bar';
    dialog.appendChild(ctrlBar);

    const barBtns = doc.createElement('div');
    barBtns.id = 'igs-bar-btns';
    ctrlBar.appendChild(barBtns);
    for (const button of ORIGINAL_READER_TOOLBAR_BUTTONS) {
        barBtns.appendChild(createReaderButton(doc, button.id, button.title, button.html));
    }

    const settings = doc.createElement('div');
    settings.id = 'igs-settings';
    settings.setAttribute('aria-hidden', 'true');
    ctrlBar.appendChild(settings);

    const pinned = doc.createElement('div');
    pinned.id = 'igs-bar-pinned';
    ctrlBar.appendChild(pinned);

    ctrlBar.appendChild(createReaderButton(doc, 'toggle-bar', '收纳/展开按钮', ORIGINAL_READER_ICONS.toggleBar));
    ctrlBar.appendChild(createReaderButton(doc, 'close', '退出', ORIGINAL_READER_ICONS.close));

    const progress = doc.createElement('div');
    progress.id = 'igs-progress';
    progress.className = 'igs-progress';
    dialog.appendChild(progress);

    const statusLine = doc.createElement('div');
    statusLine.id = 'igs-status-line';
    statusLine.className = 'igs-status-line';
    dialog.appendChild(statusLine);

    const speakerEl = doc.createElement('div');
    speakerEl.id = 'igs-speaker';
    speakerEl.className = 'igs-speaker';
    dialog.appendChild(speakerEl);

    const dividerEl = doc.createElement('div');
    dividerEl.id = 'igs-divider';
    dividerEl.className = 'igs-divider';
    dialog.appendChild(dividerEl);

    const text = doc.createElement('div');
    text.id = 'igs-text';
    text.className = 'igs-text';
    dialog.appendChild(text);

    const controls = doc.createElement('div');
    controls.className = 'igs-controls';
    dialog.appendChild(controls);

    const sendStatus = doc.createElement('div');
    sendStatus.id = 'igs-send-status';
    sendStatus.setAttribute('aria-live', 'polite');
    controls.appendChild(sendStatus);

    const spinner = doc.createElement('span');
    spinner.className = 'igs-spinner';
    sendStatus.appendChild(spinner);

    const sendStatusText = doc.createElement('span');
    sendStatusText.id = 'igs-send-status-text';
    sendStatusText.textContent = '已发送，等待 AI 回复…';
    sendStatus.appendChild(sendStatusText);

    const input = doc.createElement('input');
    input.id = 'igs-input';
    input.className = 'igs-input';
    input.type = 'text';
    input.placeholder = '输入内容后按 Enter 发送';
    controls.appendChild(input);

    const sendButton = doc.createElement('button');
    sendButton.id = 'igs-send-btn';
    sendButton.className = 'igs-send-btn';
    sendButton.type = 'button';
    sendButton.textContent = '发送';
    controls.appendChild(sendButton);

    const toast = doc.createElement('div');
    toast.id = 'igs-toast';
    toast.setAttribute('aria-live', 'polite');
    dialog.appendChild(toast);

    return overlay;
}

export function buildFallbackSettingsOverlay(doc, snapshot, ctx = {}) {
    if (!doc || typeof doc.createElement !== 'function') return null;
    const overlay = doc.createElement('div');
    overlay.id = 'igs-unified-settings';
    overlay.setAttribute('data-igs-igs-ui', 'true');

    const shell = doc.createElement('div');
    shell.className = 'igs-settings-shell';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-label', '设置');
    overlay.appendChild(shell);

    const head = doc.createElement('div');
    head.className = 'igs-settings-head';
    shell.appendChild(head);

    const title = doc.createElement('div');
    title.className = 'igs-settings-title';
    title.textContent = '设置';
    head.appendChild(title);

    const badge = doc.createElement('div');
    badge.className = 'igs-settings-badge';
    badge.textContent = ctx.version || '0.5.4';
    head.appendChild(badge);

    const close = doc.createElement('button');
    close.className = 'igs-settings-close';
    close.type = 'button';
    close.setAttribute('data-action', 'close');
    close.setAttribute('aria-label', '关闭');
    close.textContent = '×';
    head.appendChild(close);

    const tabs = doc.createElement('div');
    tabs.className = 'igs-settings-tabs';
    shell.appendChild(tabs);
    for (const tab of snapshot.tabs || []) {
        const button = doc.createElement('button');
        button.className = `igs-settings-tab${tab.active ? ' is-active' : ''}`;
        button.type = 'button';
        button.setAttribute('data-tab', tab.id);
        button.textContent = tab.label;
        tabs.appendChild(button);
    }

    const body = doc.createElement('div');
    body.className = 'igs-settings-body';
    if (typeof ctx.renderSettingsBody === 'function') {
        body.innerHTML = ctx.renderSettingsBody(snapshot.tab, snapshot.draft, {
            imageResult: snapshot.resultText && snapshot.resultText.image,
            imageModelsMessage: snapshot.resultText && snapshot.resultText.imageModels,
            virtualRegexPreview: snapshot.resultText && snapshot.resultText.virtualRegex,
        });
    }
    shell.appendChild(body);
    return overlay;
}

export function applyToolbarState(root, current) {
    if (!root || !current) return;
    const collapsible = root.querySelector('#igs-bar-btns');
    const pinned = root.querySelector('#igs-bar-pinned');
    const readerSettings = current.snapshot && current.snapshot.readerSettings || {};
    const pins = new Set(Array.isArray(readerSettings.pinnedBtns) ? readerSettings.pinnedBtns : []);
    const hiddenSet = new Set(Array.isArray(readerSettings.hiddenBtns) ? readerSettings.hiddenBtns : []);
    const order = Array.isArray(readerSettings.btnOrder) && readerSettings.btnOrder.length
        ? readerSettings.btnOrder
        : TOOLBAR_ACTIONS.map(([id]) => id);

    for (const id of order) {
        const button = root.querySelector(`#igs-btn-${id}`);
        if (!button) continue;
        if (hiddenSet.has(id)) {
            button.style.display = 'none';
        } else {
            button.style.display = '';
            if (pins.has(id) && pinned) {
                pinned.appendChild(button);
            } else if (collapsible) {
                collapsible.appendChild(button);
            }
        }
    }

    if (collapsible) {
        collapsible.style.display = current.toolbarCollapsed ? 'none' : 'flex';
        collapsible.style.gap = '6px';
        collapsible.style.alignItems = 'center';
    }
    if (pinned) {
        pinned.style.display = 'flex';
        pinned.style.gap = '6px';
        pinned.style.alignItems = 'center';
    }
}

export function applyReaderSettingsToDom(root, snapshot, current, refs = {}) {
    const dialog = refs.dialog || root.querySelector('#igs-dialog');
    const textEl = refs.textEl || root.querySelector('#igs-text');
    const toolbar = refs.toolbar || root.querySelector('#igs-ctrl-bar');
    const controls = root.querySelector('.igs-controls');
    const bg = root.querySelector('#igs-bg');
    const bgBlur = root.querySelector('#igs-bg-blur');
    const readerSettings = snapshot.readerSettings || {};
    const inlineMode = snapshot.mode === 'pc' || snapshot.mode === 'mobile';
    const win = getOwnerWindow(root);
    const overlayWidth = readElementWidth(root, win && win.innerWidth);
    const overlayHeight = readElementHeight(root, win && win.innerHeight);

    if (textEl) {
        textEl.style.fontSize = `${readerSettings.fontSize}px`;
        textEl.style.lineHeight = computeLineHeight(readerSettings.fontSize);
        if (readerSettings.dialogHeight == null) {
            textEl.style.minHeight = '0';
        } else if (inlineMode) {
            const maxHeight = Math.max(40, Math.floor((overlayHeight || 0) * 0.24));
            textEl.style.minHeight = `${Math.min(readerSettings.dialogHeight, maxHeight || readerSettings.dialogHeight)}px`;
        } else {
            textEl.style.minHeight = `${readerSettings.dialogHeight}px`;
        }
    }

    if (dialog) {
        if (readerSettings.dialogWidth == null) {
            dialog.style.width = '';
        } else if (inlineMode) {
            const clampedWidth = Math.max(180, Math.min(readerSettings.dialogWidth, Math.max(180, (overlayWidth || readerSettings.dialogWidth) - 24)));
            dialog.style.width = `${clampedWidth}px`;
        } else {
            const viewportWidth = Number(win && win.innerWidth) || readerSettings.dialogWidth;
            dialog.style.width = `${Math.max(260, Math.min(readerSettings.dialogWidth, Math.max(260, viewportWidth - 8)))}px`;
        }
        dialog.style.background = `rgba(20,20,22,${normalizeOpacity(readerSettings.glassOpacity, .62)})`;
    }

    if (toolbar) {
        toolbar.style.transform = `scale(${Number(readerSettings.toolbarScale || 100) / 100})`;
        toolbar.style.transformOrigin = 'right bottom';
        toolbar.style.background = `rgba(20,20,22,${Math.max(0, normalizeOpacity(readerSettings.glassOpacity, .62) - 0.07)})`;
    }

    if (controls) {
        controls.style.zoom = String(Number(readerSettings.inputScale || 100) / 100);
    }

    if (bg) {
        bg.style.backgroundSize = readerSettings.imgMode === 'contain' ? 'contain' : 'cover';
        bg.style.backgroundColor = '#000';
    }
    if (bgBlur) {
        bgBlur.style.backgroundSize = readerSettings.imgMode === 'contain' ? 'cover' : 'cover';
    }
}

export function applyReaderSnapshotToDom(root, snapshot, current, ctx = {}) {
    root.className = snapshot.classes.join(' ');
    root.setAttribute('data-igs-igs-ui', 'true');

    const bg = root.querySelector('#igs-bg');
    const bgBlur = root.querySelector('#igs-bg-blur');
    const textEl = root.querySelector('#igs-text');
    const input = root.querySelector('#igs-input');
    const send = root.querySelector('#igs-send-btn');
    const dialog = root.querySelector('#igs-dialog');
    const toolbar = root.querySelector('#igs-ctrl-bar');
    const clickLayer = root.querySelector('#igs-click-layer');
    const toast = root.querySelector('#igs-toast');

    if (bg && snapshot.content.backgroundImage) {
        bg.style.backgroundImage = `url("${snapshot.content.backgroundImage.replace(/"/g, '&quot;')}")`;
        removeImageLoadingSpinner(bg);
        removeImageEmptyPlaceholder(bg);
    } else if (bg) {
        bg.style.backgroundImage = '';
        const expectsImage = snapshot.content.imageExpectedCount > 0
            && snapshot.content.imageBoundCount < snapshot.content.imageExpectedCount;
        if (expectsImage && snapshot.content.imageLoading) {
            removeImageEmptyPlaceholder(bg);
            ensureImageLoadingSpinner(bg);
        } else if (expectsImage) {
            ensureImageEmptyPlaceholder(bg, '图片未生成');
        } else {
            removeImageLoadingSpinner(bg);
            removeImageEmptyPlaceholder(bg);
        }
    }
    if (bgBlur && snapshot.content.backgroundImage) {
        bgBlur.style.backgroundImage = `url("${snapshot.content.backgroundImage.replace(/"/g, '&quot;')}")`;
        bgBlur.style.opacity = '0.72';
    } else if (bgBlur) {
        bgBlur.style.backgroundImage = '';
        bgBlur.style.opacity = '0';
    }
    const spriteEl = root.querySelector('#igs-sprite');
    if (spriteEl && snapshot.content.spriteImage) {
        spriteEl.style.backgroundImage = `url("${snapshot.content.spriteImage.replace(/"/g, '&quot;')}")`;
        spriteEl.style.display = 'block';
        spriteEl.style.cssText += ';position:absolute;inset:0;width:100%;height:100%;transform:none;bottom:auto;left:auto';
        if (!current.spriteEditMode) {
            const spriteKey = snapshot.content.spriteCharacter || snapshot.content.speaker;
            const spriteMood = snapshot.content.spriteMood || '';
            const layout = resolveSpriteLayout(snapshot.readerSettings.spriteLayouts, snapshot.mode, spriteKey, spriteMood);
            spriteEl.style.backgroundSize = `${layout.scale}%`;
            spriteEl.style.backgroundPosition = `${layout.posX}% ${layout.posY}%`;
            igsDebug('[DEBUG-sprite] apply-layout', { mode: snapshot.mode, speaker: spriteKey, mood: spriteMood, index: snapshot.content.currentIndex, layoutKey: spriteKey ? `${snapshot.mode}::${spriteKey}::${spriteMood}` : snapshot.mode, layout: { ...layout } });
        }
    } else if (spriteEl) {
        spriteEl.style.backgroundImage = '';
        spriteEl.style.display = 'none';
    }
    if (textEl) {
        const theme = resolveActiveTheme(snapshot);
        const sceneAssetsEnabled = snapshot.readerSettings._sceneAssets && snapshot.readerSettings._sceneAssets.enabled;
        const textType = snapshot.content.textType || 'narration';
        textEl.innerHTML = renderDialogueHtml(snapshot.content.displayText, theme, sceneAssetsEnabled);
        textEl.style.fontSize = `${snapshot.readerSettings.fontSize}px`;
        textEl.style.lineHeight = computeLineHeight(snapshot.readerSettings.fontSize);
        // 角色名/分割线在场景素材模式才显示。气泡首行上方有 (line-height-1)*fontSize/2
        // 的行内留白，靠 margin 压不掉，所以这里按字号算出该留白并用负 margin-top 抵消，
        // 让「角色名→气泡」贴近「角色名→分割线」的小间距。无角色名时不偏移。
        if (sceneAssetsEnabled && snapshot.content.speaker) {
            const fontSize = Number(snapshot.readerSettings.fontSize) || 18;
            const lineHeight = Number(computeLineHeight(fontSize)) || 1.7;
            const halfLeading = Math.max(0, (lineHeight - 1) * fontSize / 2);
            textEl.style.marginTop = `-${halfLeading.toFixed(1)}px`;
        } else {
            textEl.style.marginTop = '';
        }
        const isNarration = textType === 'narration';
        const segFont = isNarration ? theme.narrationFont : theme.textFont;
        const segColor = isNarration ? theme.narrationColor : theme.textColor;
        if (sceneAssetsEnabled && segFont && segFont !== 'inherit') {
            textEl.style.fontFamily = segFont;
        } else {
            textEl.style.fontFamily = '';
        }
        if (sceneAssetsEnabled && segColor) {
            textEl.style.color = segColor;
        } else {
            textEl.style.color = '';
        }
    }
    const speakerEl = root.querySelector('#igs-speaker');
    if (speakerEl) {
        const theme = resolveActiveTheme(snapshot);
        const sceneAssetsEnabled = snapshot.readerSettings._sceneAssets && snapshot.readerSettings._sceneAssets.enabled;
        if (sceneAssetsEnabled && snapshot.content.speaker) {
            speakerEl.textContent = snapshot.content.speaker;
            speakerEl.style.display = 'block';
            speakerEl.style.textAlign = theme.nameAlign;
            speakerEl.style.fontFamily = theme.nameFont && theme.nameFont !== 'inherit' ? theme.nameFont : '';
            speakerEl.style.color = theme.nameColor || '';
        } else {
            speakerEl.style.display = 'none';
        }
    }
    const dividerEl = root.querySelector('#igs-divider');
    if (dividerEl) {
        const theme = resolveActiveTheme(snapshot);
        const sceneAssetsEnabled = snapshot.readerSettings._sceneAssets && snapshot.readerSettings._sceneAssets.enabled;
        if (sceneAssetsEnabled && snapshot.content.speaker && theme.dividerSymbol !== 'none') {
            if (theme.dividerSymbol === 'gradient') {
                dividerEl.textContent = '';
                dividerEl.style.display = 'block';
                dividerEl.style.height = '1px';
                dividerEl.style.background = `linear-gradient(90deg, transparent, ${theme.dividerColor || 'rgba(255,255,255,.15)'}, transparent)`;
                dividerEl.style.color = '';
            } else {
                dividerEl.textContent = theme.dividerSymbol;
                dividerEl.style.display = 'block';
                dividerEl.style.height = '';
                dividerEl.style.background = '';
                dividerEl.style.color = theme.dividerColor || '';
            }
        } else {
            dividerEl.style.display = 'none';
        }
    }
    const statusLine = root.querySelector('#igs-status-line');
    if (statusLine) {
        if (snapshot.readerSettings.showStatusLine) {
            statusLine.textContent = snapshot.content.progress;
            statusLine.style.display = 'block';
        } else {
            statusLine.style.display = 'none';
        }
    }
    if (dialog) {
        const sceneAssetsEnabled = snapshot.readerSettings._sceneAssets && snapshot.readerSettings._sceneAssets.enabled;
        dialog.style.paddingTop = (sceneAssetsEnabled && snapshot.content.speaker) ? '10px' : '';
    }
    if (input) {
        input.placeholder = snapshot.input.placeholder;
        input.value = current.inputValue;
    }
    if (send) {
        send.addEventListener('click', async () => {
            await current.controller.submit(input ? input.value : current.inputValue);
        });
    }
    if (clickLayer) {
        clickLayer.addEventListener('click', () => {
            if (current.dragSuppressClick || (current.runtime && current.runtime.dragSuppressClick)) {
                current.dragSuppressClick = false;
                if (current.runtime) current.runtime.dragSuppressClick = false;
                return;
            }
            if (current.hidden) {
                current.controller.toggleHidden();
                return;
            }
            if (ctx.hasActiveSettings && ctx.hasActiveSettings()) {
                if (typeof ctx.closeSettings === 'function') ctx.closeSettings();
                return;
            }
            if (typeof ctx.handleReaderAction === 'function') ctx.handleReaderAction('next');
        });
    }
    if (dialog) {
        dialog.addEventListener('click', (event) => {
            if (current.hidden) return;
            if (event.target && event.target.closest && (
                event.target.closest('.igs-controls')
                || event.target.closest('#igs-ctrl-bar')
                || event.target.closest('#igs-settings')
            )) {
                return;
            }
            const rect = typeof dialog.getBoundingClientRect === 'function'
                ? dialog.getBoundingClientRect()
                : { left: 0, width: 0 };
            const clientX = Number(event.clientX);
            if (!Number.isFinite(clientX) || clientX < rect.left + rect.width / 2) {
                if (typeof ctx.handleReaderAction === 'function') ctx.handleReaderAction('prev');
            } else {
                if (typeof ctx.handleReaderAction === 'function') ctx.handleReaderAction('next');
            }
        });
    }
    if (dialog) {
        dialog.classList.toggle('igs-hidden', current.hidden);
        if (snapshot.readerSettings.glassOpacity != null) {
            dialog.style.background = `rgba(20,20,22,${snapshot.readerSettings.glassOpacity})`;
        }
    }
    applyToolbarState(root, current);
    applyReaderSettingsToDom(root, snapshot, current, { dialog, textEl, toolbar });
    applyReaderModeRuntime(root, snapshot, current, {
        isActiveReader: (reader) => (typeof ctx.isActiveReader === 'function' ? ctx.isActiveReader(reader) : true),
        requestClose: () => { if (typeof ctx.closeReader === 'function') ctx.closeReader(); },
    });
    if (toast) {
        toast.textContent = current.toastMessage || '';
        toast.style.opacity = current.toastMessage ? '1' : '0';
    }
}
