export const ORIGINAL_READER_ICONS = Object.freeze({
    prev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="15 18 9 12 15 6"/></svg>',
    next: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="9 18 15 12 9 6"/></svg>',
    regen: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
    rescan: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>',
    save: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 5 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 5a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.4.6.8 1 1 .3.2.7.3 1.1.3H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
    hide: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    prevTurn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none"/><line x1="5" y1="19" x2="5" y2="5"/></svg>',
    nextTurn: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block"><polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
    toggleBar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:block"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:block"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
});

export const ORIGINAL_READER_TOOLBAR_BUTTONS = Object.freeze([
    { id: 'prev', title: '上一段', html: ORIGINAL_READER_ICONS.prev },
    { id: 'next', title: '下一段', html: ORIGINAL_READER_ICONS.next },
    { id: 'regen', title: '重新生成背景图', html: ORIGINAL_READER_ICONS.regen },
    { id: 'rescan', title: '刷新图位', html: ORIGINAL_READER_ICONS.rescan },
    { id: 'save', title: '保存背景图', html: ORIGINAL_READER_ICONS.save },
    { id: 'settings', title: '设置', html: ORIGINAL_READER_ICONS.settings },
    { id: 'hide', title: '隐藏/显示对话框', html: ORIGINAL_READER_ICONS.hide },
    { id: 'prev-turn', title: '上一轮', html: ORIGINAL_READER_ICONS.prevTurn },
    { id: 'next-turn', title: '下一轮', html: ORIGINAL_READER_ICONS.nextTurn },
]);

const ORIGINAL_READER_STYLE_TEXT = `
#vn-overlay{position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;height:100dvh;z-index:900;background:#000;overflow:hidden;overscroll-behavior:none;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;color:#fff;}
#vn-overlay.vn-floating,#vn-overlay.vn-mode-web,#vn-overlay.vn-mode-fullscreen{z-index:2147483000;}
#vn-overlay.vn-fading{opacity:0;transition:opacity .25s;}
#vn-bg{position:absolute;inset:0;background:radial-gradient(circle at 30% 30%, #2a2a3a 0%, #0c0c11 80%);background-position:center;background-size:cover;background-repeat:no-repeat;transition:opacity .3s ease;filter:brightness(.88);}
#vn-bg-blur{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;transition:opacity .3s ease;filter:blur(40px) brightness(.55) saturate(1.3);transform:scale(1.12);opacity:0;pointer-events:none;}
#vn-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.6) 0%,rgba(0,0,0,.1) 50%,rgba(0,0,0,0) 80%);pointer-events:none;}
#vn-click-layer{position:absolute;inset:0;cursor:pointer;z-index:1;}
.vn-dialog{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);width:min(880px,calc(100vw - 32px));background:rgba(20,20,22,.62);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(32px) saturate(180%);border-radius:22px;box-shadow:0 12px 48px rgba(0,0,0,.5);padding:22px 26px 18px;z-index:4;overflow:visible;transition:opacity .3s,transform .3s;}
.vn-dialog.vn-hidden{opacity:0;transform:translateX(-50%) translateY(20px);pointer-events:none;}
#vn-overlay.vn-floating #vn-click-layer{cursor:grab;touch-action:none;}
#vn-overlay.vn-floating.is-dragging #vn-click-layer{cursor:grabbing;}
#vn-overlay.vn-floating .vn-dialog{box-sizing:border-box;left:12px;right:12px;bottom:14px;width:auto;transform:none;display:flex;flex-direction:column;max-height:min(46%,220px);overflow:visible;padding:16px 18px 14px;}
#vn-overlay.vn-floating .vn-dialog.vn-hidden{transform:translateY(20px);}
#vn-overlay.vn-floating-mobile .vn-dialog{left:10px;right:10px;bottom:12px;max-height:min(42%,190px);padding:14px 14px 12px;}
.vn-ctrl-bar{position:absolute;top:-50px;right:0;display:flex;gap:6px;z-index:5;padding:6px;background:rgba(20,20,22,.12);border:1px solid rgba(255,255,255,.10);backdrop-filter:blur(48px) saturate(220%);border-radius:18px;box-shadow:0 4px 24px rgba(0,0,0,.20);}
.vn-icon-btn{width:36px;height:36px;border:1px solid transparent;cursor:pointer;background:transparent;color:rgba(255,255,255,.52);font-size:15px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;transition:all .18s;outline:none;}
.vn-icon-btn:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.18);color:rgba(255,255,255,.96);}
#vn-bar-btns{display:none;gap:6px;align-items:center;}
#vn-bar-pinned{display:flex;gap:6px;align-items:center;}
.vn-progress{font-size:11px;color:rgba(255,255,255,.55);margin-bottom:10px;letter-spacing:1px;}
.vn-text{font-size:18px;line-height:1.7;letter-spacing:.5px;min-height:60px;color:#f4f4f6;text-shadow:0 1px 2px rgba(0,0,0,.6);margin-bottom:14px;white-space:pre-wrap;word-break:break-word;}
.vn-controls{display:flex;align-items:center;gap:8px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px;}
#vn-overlay.vn-floating .vn-progress{flex-shrink:0;}
#vn-overlay.vn-floating .vn-text{min-height:0;overflow-y:auto;margin-bottom:12px;flex:1 1 auto;}
#vn-overlay.vn-floating .vn-controls{flex-shrink:0;}
.vn-input{flex:1;min-width:0;height:32px;box-sizing:border-box;padding:0 12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;color:#fff;font-size:14px;line-height:18px;outline:none;font-family:inherit;}
.vn-input:focus{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.3);}
.vn-input::placeholder{color:rgba(255,255,255,.4);}
.vn-send-btn{height:32px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-width:58px;padding:0 12px;border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.72);font-size:13px;line-height:18px;font-weight:600;letter-spacing:0;white-space:nowrap;cursor:pointer;}
.vn-send-btn:hover{background:rgba(255,255,255,.14);color:rgba(255,255,255,.92);}
.vn-send-btn:focus{border-color:rgba(92,170,255,.58);box-shadow:0 0 0 2px rgba(92,170,255,.18);outline:none;}
.vn-send-btn:disabled{opacity:.55;pointer-events:none;}
@keyframes vn-spin{to{transform:rotate(360deg);}}
.vn-spinner{display:inline-block;width:10px;height:10px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:vn-spin .8s linear infinite;}
.vn-image-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1;}
.vn-image-spinner{width:32px;height:32px;border-width:3px;opacity:.7;}
#vn-send-status{display:none;flex:1;align-items:center;gap:8px;padding:8px 14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:14px;font-size:13px;color:rgba(255,255,255,.55);letter-spacing:.3px;}
#vn-settings{display:none;position:absolute;right:0;bottom:calc(100% + 10px);min-width:232px;background:rgba(16,16,20,.92);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(40px) saturate(180%);border-radius:18px;padding:16px 18px 14px;box-shadow:0 10px 40px rgba(0,0,0,.6);z-index:30;}
#vn-toast{position:absolute;left:50%;top:24px;transform:translateX(-50%);min-width:200px;max-width:min(420px,calc(100vw - 32px));padding:10px 14px;border-radius:12px;background:rgba(16,16,20,.88);border:1px solid rgba(255,255,255,.12);font-size:12px;line-height:1.45;opacity:0;pointer-events:none;}
`.trim();

const ORIGINAL_READER_HTML = `
<div id="vn-bg-blur"></div>
<div id="vn-bg"></div>
<div id="vn-click-layer"></div>
<div class="vn-dialog" id="vn-dialog">
  <div class="vn-ctrl-bar" id="vn-ctrl-bar">
    <div id="vn-bar-btns">
      ${ORIGINAL_READER_TOOLBAR_BUTTONS.map((button) => (
        `<button class="vn-icon-btn" id="vn-btn-${button.id}" data-act="${button.id}" title="${button.title}" type="button">${button.html}</button>`
      )).join('')}
    </div>
    <div id="vn-settings" aria-hidden="true"></div>
    <div id="vn-bar-pinned"></div>
    <button class="vn-icon-btn" data-act="toggle-bar" title="收纳/展开按钮" type="button">${ORIGINAL_READER_ICONS.toggleBar}</button>
    <button class="vn-icon-btn" data-act="close" title="退出" type="button">${ORIGINAL_READER_ICONS.close}</button>
  </div>
  <div class="vn-progress" id="vn-progress"></div>
  <div class="vn-text" id="vn-text"></div>
  <div class="vn-controls">
    <div id="vn-send-status" aria-live="polite"><span class="vn-spinner"></span><span id="vn-send-status-text">已发送，等待 AI 回复…</span></div>
    <input class="vn-input" id="vn-input" type="text" placeholder="输入内容后按 Enter 发送">
    <button class="vn-send-btn" id="vn-send-btn" type="button">发送</button>
  </div>
  <div id="vn-toast" aria-live="polite"></div>
</div>
`.trim();

export const ORIGINAL_READER_REQUIRED_SELECTORS = Object.freeze([
    '#vn-overlay',
    '#vn-bg',
    '#vn-bg-blur',
    '#vn-click-layer',
    '.vn-dialog',
    '.vn-ctrl-bar',
    '#vn-bar-btns',
    '#vn-settings',
    '.vn-controls',
    '#vn-send-status',
    '#vn-input',
    '#vn-send-btn',
    '#vn-toast',
]);

export const ORIGINAL_READER_STYLE_CONTRACT = Object.freeze({
    overlayZIndex: '2147483000',
    dialogWidth: 'min(880px,calc(100vw - 32px))',
    inputHeight: '32px',
    sendButtonMinWidth: '58px',
    toolbarButtonSize: '36px',
});

export function getOriginalReaderStyleText() {
    return ORIGINAL_READER_STYLE_TEXT;
}

export function getOriginalReaderHtml() {
    return ORIGINAL_READER_HTML;
}

export function getOriginalReaderSource(version = '0.3.20') {
    return {
        version,
        styleText: ORIGINAL_READER_STYLE_TEXT,
        html: ORIGINAL_READER_HTML,
        selectors: Array.from(ORIGINAL_READER_REQUIRED_SELECTORS),
        styleContract: { ...ORIGINAL_READER_STYLE_CONTRACT },
    };
}
