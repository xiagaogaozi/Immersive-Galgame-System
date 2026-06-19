const LONG_TEXT = 80;

export function getDbPanelStyles() {
    return `
#igs-db-panel{position:absolute;top:48px;right:12px;width:min(440px,calc(100% - 24px));max-height:calc(100% - 130px);background:var(--igs-db-bg,rgba(20,20,22,.94));border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(32px) saturate(180%);border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.65);display:flex;flex-direction:column;z-index:10;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;color:#f4f4f6;overflow:hidden;user-select:none;}
.igs-shujuku-header{display:flex;align-items:center;gap:8px;padding:13px 16px 10px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;cursor:grab;}
.igs-shujuku-header:active{cursor:grabbing;}
.igs-shujuku-title{font-size:13px;font-weight:600;letter-spacing:.5px;flex:1;}
.igs-shujuku-close{width:26px;height:26px;border:none;background:transparent;color:rgba(255,255,255,.45);cursor:pointer;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;line-height:1;padding:0;}
.igs-shujuku-close:hover{background:rgba(255,255,255,.1);color:#fff;}
.igs-shujuku-warning{padding:5px 16px;background:rgba(255,180,0,.1);border-bottom:1px solid rgba(255,180,0,.2);font-size:11px;color:#ffd166;display:flex;align-items:center;gap:8px;flex-shrink:0;}
.igs-shujuku-warning button{border:none;background:rgba(255,180,0,.16);color:#ffd166;border-radius:5px;padding:2px 8px;cursor:pointer;font-size:11px;}
.igs-shujuku-tabs{display:flex;gap:2px;padding:8px 14px 0;flex-shrink:0;overflow-x:auto;scrollbar-width:none;}
.igs-shujuku-tabs::-webkit-scrollbar{display:none;}
.igs-shujuku-tab{padding:4px 12px;border-radius:7px 7px 0 0;border:1px solid transparent;font-size:12px;cursor:pointer;background:transparent;color:rgba(255,255,255,.4);white-space:nowrap;}
.igs-shujuku-tab:hover{color:rgba(255,255,255,.7);}
.igs-shujuku-tab.igs-db-active{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);color:#fff;}
.igs-shujuku-body{flex:1;overflow:auto;}
.igs-shujuku-table-wrap{overflow:auto;}
.igs-shujuku-table{width:100%;border-collapse:collapse;font-size:12px;}
.igs-shujuku-table th{padding:7px 10px;text-align:left;font-size:11px;font-weight:600;color:rgba(255,255,255,.4);border-bottom:1px solid rgba(255,255,255,.1);position:sticky;top:0;background:var(--igs-db-bg,rgba(20,20,22,.98));white-space:nowrap;}
.igs-shujuku-table td{padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:top;max-width:220px;}
.igs-shujuku-table tr:hover td{background:rgba(255,255,255,.025);}
.igs-shujuku-cell{cursor:text;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.4;}
.igs-shujuku-cell.igs-db-ro{cursor:default;color:rgba(255,255,255,.4);}
.igs-shujuku-expand-hint{font-size:10px;color:rgba(92,170,255,.65);cursor:pointer;margin-left:3px;}
.igs-shujuku-cell-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1px solid rgba(92,170,255,.45);border-radius:5px;color:#fff;padding:3px 6px;font-size:12px;font-family:inherit;outline:none;}
.igs-db-del-btn{opacity:0;border:none;background:rgba(255,80,80,.15);color:#ff7070;border-radius:5px;padding:1px 6px;cursor:pointer;font-size:11px;transition:opacity .12s;white-space:nowrap;}
.igs-shujuku-table tr:hover .igs-db-del-btn{opacity:1;}
.igs-shujuku-footer{padding:7px 14px;border-top:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:8px;flex-shrink:0;}
.igs-db-add-btn{border:1px dashed rgba(255,255,255,.18);background:transparent;color:rgba(255,255,255,.5);border-radius:7px;padding:3px 10px;cursor:pointer;font-size:12px;}
.igs-db-add-btn:hover{background:rgba(255,255,255,.05);color:#fff;}
.igs-db-status{font-size:11px;color:rgba(255,255,255,.3);flex:1;text-align:right;}
.igs-shujuku-empty{padding:28px 16px;text-align:center;color:rgba(255,255,255,.28);font-size:13px;}
.igs-db-modal-bg{position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:20;display:flex;align-items:center;justify-content:center;}
.igs-db-modal{background:rgba(22,22,26,.99);border:1px solid rgba(255,255,255,.14);border-radius:14px;width:min(580px,calc(100vw - 32px));padding:18px;display:flex;flex-direction:column;gap:10px;}
.igs-db-modal-label{font-size:12px;color:rgba(255,255,255,.45);}
.igs-db-modal textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#f4f4f6;padding:9px;font-size:12px;font-family:inherit;outline:none;resize:vertical;min-height:140px;}
.igs-db-modal textarea:focus{border-color:rgba(92,170,255,.5);}
.igs-db-modal-btns{display:flex;gap:8px;justify-content:flex-end;}
.igs-db-modal-btns button{border-radius:8px;padding:5px 14px;cursor:pointer;font-size:12px;}
.igs-db-modal-save{background:rgba(92,170,255,.18);color:#7ab8ff;border:1px solid rgba(92,170,255,.3);}
.igs-db-modal-cancel{background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.14);}
`.trim();
}

export function renderDbPanelInner(state) {
    const { tables, activeUid, status, errorMsg, externalPending } = state;
    if (status === 'loading') return `<div class="igs-shujuku-empty">加载中…</div>`;
    if (status === 'no-api') return `<div class="igs-shujuku-empty">未检测到 shujuku 数据库插件</div>`;
    if (status === 'error') return `<div class="igs-shujuku-empty">加载失败：${e(errorMsg || '未知错误')}</div>`;
    if (!tables.length) return `<div class="igs-shujuku-empty">当前角色卡没有数据表</div>`;

    const active = tables.find(t => t.uid === activeUid) || tables[0];

    const warning = externalPending
        ? `<div class="igs-shujuku-warning">⚠ 表格已被外部更新 <button data-db-act="refresh">刷新</button></div>`
        : '';

    const tabs = tables.map(t =>
        `<button class="igs-shujuku-tab${t.uid === active.uid ? ' igs-db-active' : ''}" data-db-tab="${e(t.uid)}">${e(t.name)}</button>`
    ).join('');

    const tableHtml = renderTable(active);
    const rowCount = active.rows.length;

    return `${warning}<div class="igs-shujuku-tabs">${tabs}</div>`
        + `<div class="igs-shujuku-body"><div class="igs-shujuku-table-wrap">${tableHtml}</div></div>`
        + `<div class="igs-shujuku-footer"><button class="igs-db-add-btn" data-db-act="add-row">+ 新增行</button>`
        + `<span class="igs-db-status">${rowCount} 行</span></div>`;
}

function renderTable(table) {
    if (!table.columns.length) return `<div class="igs-shujuku-empty">空表</div>`;
    const ths = table.columns.map(col => `<th>${e(col)}</th>`).join('') + '<th></th>';
    const trs = table.rows.map((row, rowIdx) => {
        const tds = table.columns.map((_, colIdx) => {
            const val = String(row[colIdx] ?? '');
            if (colIdx === 0) return `<td><span class="igs-shujuku-cell igs-db-ro">${e(val)}</span></td>`;
            if (val.length > LONG_TEXT) {
                return `<td><span class="igs-shujuku-cell" data-db-expand="${rowIdx}:${colIdx}">`
                    + `${e(val.slice(0, 60))}…<span class="igs-shujuku-expand-hint">✏</span></span></td>`;
            }
            return `<td><span class="igs-shujuku-cell" data-db-edit="${rowIdx}:${colIdx}">${e(val)}</span></td>`;
        }).join('');
        const rowId = parseInt(row[0], 10);
        return `<tr>${tds}<td><button class="igs-db-del-btn" data-db-act="delete-row" data-db-row="${rowId}">删除</button></td></tr>`;
    }).join('');
    return `<table class="igs-shujuku-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function e(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
