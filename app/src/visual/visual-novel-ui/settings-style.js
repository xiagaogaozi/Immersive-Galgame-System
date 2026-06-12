const SETTINGS_STYLE_TEXT = `
#vnm-unified-settings{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.46);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;color:rgba(255,255,255,.9);--vnm-settings-vleft:0px;--vnm-settings-vtop:0px;--vnm-settings-vw:100vw;--vnm-settings-vh:100vh;--vnm-settings-width:min(760px,calc(var(--vnm-settings-vw) - 48px));--vnm-settings-height:min(760px,calc(var(--vnm-settings-vh) - 48px));}
.vnm-settings-shell{width:var(--vnm-settings-width);height:var(--vnm-settings-height);background:rgba(20,20,22,.86);border:1px solid rgba(255,255,255,.14);border-radius:22px;box-shadow:0 24px 70px rgba(0,0,0,.58);display:flex;flex-direction:column;overflow:hidden}
.vnm-settings-head{height:54px;display:flex;align-items:center;gap:10px;padding:0 16px 0 20px;border-bottom:1px solid rgba(255,255,255,.09)}
.vnm-settings-title{font-size:16px;font-weight:650;letter-spacing:.2px;flex:1}
.vnm-settings-badge{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.56)}
.vnm-settings-close{width:34px;height:34px;border:0;background:transparent;color:rgba(255,255,255,.62);font-size:18px;border-radius:12px;cursor:pointer}
.vnm-settings-close:hover,.vnm-settings-close:focus{background:rgba(255,255,255,.13);color:#fff;outline:none}
.vnm-settings-tabs{display:flex;gap:6px;padding:12px 20px 0}
.vnm-settings-tab{border:0;background:transparent;color:rgba(255,255,255,.48);padding:7px 10px;border-radius:10px;font:inherit;font-size:12px;white-space:nowrap;cursor:pointer}
.vnm-settings-tab.is-active{background:rgba(255,255,255,.14);color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.22)}
.vnm-settings-body{flex:1;min-height:0;overflow-y:auto;padding:14px 20px 16px}
.vnm-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}
.vnm-settings-section{display:flex;flex-direction:column;gap:12px}
.vnm-settings-field{display:flex;flex-direction:column;gap:7px;font-size:12px;color:rgba(255,255,255,.58)}
.vnm-settings-field em{font-style:normal;font-size:11px;color:rgba(255,255,255,.36);line-height:1.45}
.vnm-settings-field input,.vnm-settings-field select,.vnm-settings-field textarea{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:rgba(255,255,255,.92);border-radius:11px;padding:9px 11px;font:inherit;font-size:13px;outline:none}
.vnm-settings-field textarea{min-height:132px;resize:vertical;line-height:1.55;font-family:ui-monospace,Consolas,monospace}
.vnm-settings-field input:focus,.vnm-settings-field select:focus,.vnm-settings-field textarea:focus{border-color:rgba(92,170,255,.58);background:rgba(255,255,255,.11)}
.vnm-settings-api-group{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}
.vnm-settings-api-group.is-disabled{opacity:.52;filter:saturate(.65)}
.vnm-settings-api-group.is-disabled input,.vnm-settings-api-group.is-disabled select,.vnm-settings-api-group.is-disabled textarea{color:rgba(255,255,255,.42);background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.08);cursor:not-allowed}
.vnm-settings-api-group.is-disabled .vnm-settings-action,.vnm-settings-api-group.is-disabled .vnm-settings-secret-toggle{cursor:not-allowed}
.vnm-settings-api-group.is-disabled .vnm-settings-field em{color:rgba(255,255,255,.34)}
.vnm-settings-secret{display:flex;align-items:center;gap:8px}
.vnm-settings-secret input{flex:1;min-width:0}
.vnm-settings-secret-toggle{height:36px;min-width:52px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:rgba(255,255,255,.68);border-radius:11px;font:inherit;font-size:12px;cursor:pointer}
.vnm-settings-secret-toggle:hover,.vnm-settings-secret-toggle:focus{background:rgba(255,255,255,.13);color:#fff;outline:none;border-color:rgba(255,255,255,.18)}
.vnm-settings-model{display:grid;grid-template-columns:minmax(0,1fr) 96px;gap:8px;width:100%;align-items:center}
.vnm-settings-model-row{display:contents}
.vnm-settings-model input{height:36px;min-width:0}
.vnm-settings-model select{grid-column:1 / -1;height:36px}
.vnm-settings-model select:disabled{opacity:.55;cursor:not-allowed}
.vnm-settings-inline-action{width:96px;height:36px;padding:0 10px;white-space:nowrap}
.vnm-settings-action.is-active,.vnm-settings-inline-action.is-active{background:rgba(255,255,255,.18);border-color:rgba(255,255,255,.28);color:#fff}
.vnm-settings-action[disabled],.vnm-settings-inline-action[disabled]{opacity:.55;cursor:not-allowed;pointer-events:none}
.vnm-segmented-field .vnm-settings-field{width:100%}
.vnm-segmented{height:40px;display:grid;grid-template-columns:repeat(var(--vnm-segment-count,3),minmax(0,1fr));align-items:center;gap:0;padding:4px;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);border-radius:14px;position:relative;overflow:hidden}
.vnm-segmented-indicator{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px) / var(--vnm-segment-count,3));border-radius:10px;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.10));box-shadow:0 1px 4px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.12);transform:translateX(calc(var(--vnm-active-index,0) * 100%));transition:transform .16s ease,background .16s ease;pointer-events:none}
.vnm-segmented-btn{height:32px;min-width:0;position:relative;z-index:1;border:0;border-radius:10px;background:transparent;color:rgba(255,255,255,.48);font:inherit;font-size:12px;line-height:18px;font-weight:650;letter-spacing:0;white-space:nowrap;cursor:pointer;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:color .12s,text-shadow .12s,transform .1s}
.vnm-segmented-btn-icon{width:15px;height:15px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;color:currentColor}
.vnm-segmented-btn-icon svg{width:15px;height:15px;display:block}
.vnm-segmented-btn-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
.vnm-segmented-btn:hover{color:rgba(255,255,255,.86)}
.vnm-segmented-btn:active{transform:scale(.97)}
.vnm-segmented-btn:focus{outline:none;box-shadow:0 0 0 2px rgba(92,170,255,.18)}
.vnm-segmented-btn.is-active{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.35)}
.vnm-switch{height:38px;display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.07);color:rgba(255,255,255,.72);border-radius:12px;padding:0 12px;cursor:pointer;text-align:left;font:inherit;font-size:13px}
.vnm-switch i{width:30px;height:18px;border-radius:999px;background:rgba(255,255,255,.18);position:relative;flex-shrink:0}
.vnm-switch i:after{content:"";position:absolute;width:14px;height:14px;top:2px;left:2px;border-radius:50%;background:#fff;transition:left .16s}
.vnm-switch.is-on{color:#fff;border-color:rgba(10,132,255,.38);background:rgba(10,132,255,.18)}
.vnm-switch.is-on i{background:rgb(10,132,255)}
.vnm-switch.is-on i:after{left:14px}
.vnm-source-filter{grid-column:1/-1;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035);display:flex;flex-direction:column;gap:12px}
.vnm-source-filter-title{font-size:12px;line-height:18px;font-weight:650;color:rgba(255,255,255,.72)}
.vnm-source-filter-note{font-size:11px;line-height:16px;font-weight:400;color:rgba(255,255,255,.38)}
.vnm-source-filter-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}
.vnm-source-filter textarea{min-height:76px}
.vnm-body-format textarea[data-path="bridge.virtualRegex.replacement"]{min-height:132px}
.vnm-settings-row{display:flex;gap:10px;align-items:center}
.vnm-settings-row > *{flex:1}
.vnm-settings-result{min-height:18px;font-size:12px;color:rgba(255,255,255,.48);line-height:1.5}
.vnm-settings-result.is-ok{color:rgba(93,220,147,.95)}
.vnm-settings-result.is-error{color:rgba(255,118,118,.95)}
.vnm-settings-danger{border-color:rgba(255,92,92,.24);color:rgba(255,156,156,.88);}
.vnm-settings-full{grid-column:1/-1}
.vnm-settings-preview{white-space:pre-wrap;max-height:220px;overflow:auto;font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:1.55;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(0,0,0,.18);padding:12px;color:rgba(255,255,255,.78)}
@media (max-width:640px){#vnm-unified-settings{--vnm-settings-width:min(760px,calc(var(--vnm-settings-vw) - 24px));--vnm-settings-height:min(760px,calc(var(--vnm-settings-vh) - 24px));padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}.vnm-settings-shell{width:var(--vnm-settings-width);height:var(--vnm-settings-height);border-radius:18px}.vnm-settings-grid,.vnm-settings-api-group,.vnm-source-filter-grid{grid-template-columns:1fr}.vnm-segmented{height:40px}.vnm-segmented-btn{font-size:11px;padding:0 4px;gap:4px}}
`.trim();

export function getSettingsStyleText() {
    return SETTINGS_STYLE_TEXT;
}
