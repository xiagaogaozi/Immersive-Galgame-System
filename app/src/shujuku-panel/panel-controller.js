import { createShujukuClient } from '../data/shujuku/client.js';
import { parseTables } from './panel-model.js';
import { getDbPanelStyles, renderDbPanelInner } from './panel-render.js';

export function createDbPanelController(doc, global) {
    let root = null;
    let modalRoot = null;
    let client = null;
    let igsWriting = false;
    const state = { tables: [], activeUid: '', status: 'loading', errorMsg: '', externalPending: false };

    const externalCallback = () => {
        if (igsWriting || !root) return;
        state.externalPending = true;
        render();
    };

    function ensureStyle() {
        const id = 'igs-db-panel-style';
        if (!doc.getElementById(id)) {
            const s = doc.createElement('style');
            s.id = id;
            s.textContent = getDbPanelStyles();
            doc.head.appendChild(s);
        }
    }

    function render() {
        if (!root) return;
        const inner = root.querySelector('#igs-db-inner');
        if (inner) inner.innerHTML = renderDbPanelInner(state);
    }

    async function loadData() {
        const api = (global || globalThis).AutoCardUpdaterAPI || null;
        client = createShujukuClient(api);
        const result = client.readTables();
        if (!result.ok) {
            state.status = result.reason === 'missing-api' ? 'no-api' : 'error';
            state.errorMsg = result.reason || '';
            render();
            return;
        }
        state.tables = parseTables(result.data);
        state.status = 'ready';
        if (!state.tables.find(t => t.uid === state.activeUid))
            state.activeUid = state.tables[0] ? state.tables[0].uid : '';
        state.externalPending = false;
        render();
    }

    function open() {
        if (root) return;

        // conflict detection
        const shujukuOpen = doc.querySelector('#shujuku_v104-main-window,[id^="shujuku"][id$="-main-window"]');
        if (shujukuOpen && shujukuOpen.offsetParent !== null) {
            const win = doc.defaultView || globalThis;
            if (!win.confirm('骰子系统数据库面板正在打开中，同时编辑可能导致数据冲突，是否继续？'))
                return;
        }

        ensureStyle();
        root = doc.createElement('div');
        root.id = 'igs-db-panel';
        root.innerHTML = `<div class="igs-shujuku-header">`
            + `<span class="igs-shujuku-title">数据库</span>`
            + `<button class="igs-shujuku-close" data-db-act="close" title="关闭">×</button>`
            + `</div><div id="igs-db-inner"></div>`;
        doc.body.appendChild(root);

        root.addEventListener('click', onClick);
        root.addEventListener('focusout', onFocusOut);

        client = createShujukuClient((global || globalThis).AutoCardUpdaterAPI || null);
        client.registerCallback(externalCallback);
        state.status = 'loading';
        render();
        loadData();
    }

    function close() {
        if (!root) return;
        root.removeEventListener('click', onClick);
        root.removeEventListener('focusout', onFocusOut);
        root.remove();
        root = null;
        closeModal();
        if (client) client.unregisterCallback(externalCallback);
    }

    function toggle() { root ? close() : open(); }

    async function onClick(event) {
        const act = event.target.closest('[data-db-act]');
        if (act) {
            const action = act.getAttribute('data-db-act');
            if (action === 'close') { close(); return; }
            if (action === 'refresh') { state.externalPending = false; await loadData(); return; }
            if (action === 'add-row') { await doAddRow(); return; }
            if (action === 'delete-row') {
                await doDeleteRow(parseInt(act.getAttribute('data-db-row'), 10));
                return;
            }
        }
        const tab = event.target.closest('[data-db-tab]');
        if (tab) { state.activeUid = tab.getAttribute('data-db-tab'); render(); return; }

        const editCell = event.target.closest('[data-db-edit]');
        if (editCell) { activateInline(editCell); return; }

        const expandCell = event.target.closest('[data-db-expand]');
        if (expandCell) { openModal(expandCell); }
    }

    function activateInline(cell) {
        const [ri, ci] = cell.getAttribute('data-db-edit').split(':').map(Number);
        const table = activeTable();
        if (!table) return;
        const row = table.rows[ri];
        if (!row) return;
        const input = doc.createElement('input');
        input.className = 'igs-shujuku-cell-input';
        input.value = String(row[ci] ?? '');
        input.setAttribute('data-db-commit', `${ri}:${ci}`);
        cell.replaceWith(input);
        input.focus();
        input.select();
    }

    async function onFocusOut(event) {
        const input = event.target;
        if (!input || !input.hasAttribute('data-db-commit')) return;
        const [ri, ci] = input.getAttribute('data-db-commit').split(':').map(Number);
        const table = activeTable();
        if (!table) { render(); return; }
        const row = table.rows[ri];
        if (!row) { render(); return; }
        const oldVal = String(row[ci] ?? '');
        const newVal = input.value;
        if (newVal === oldVal) { render(); return; }
        const rowId = parseInt(row[0], 10);
        const colName = table.columns[ci];
        igsWriting = true;
        row[ci] = newVal;
        render();
        const result = await client.updateCell(table.name, rowId, colName, newVal);
        igsWriting = false;
        if (!result.ok) { row[ci] = oldVal; render(); }
        else await client.refresh();
    }

    async function doAddRow() {
        const table = activeTable();
        if (!table || !client) return;
        const maxId = table.rows.reduce((m, r) => Math.max(m, parseInt(r[0] || 0, 10)), 0);
        const rowData = Object.fromEntries(table.columns.map((col, i) => [col, i === 0 ? String(maxId + 1) : '']));
        igsWriting = true;
        const result = await client.insertRow(table.name, rowData);
        igsWriting = false;
        if (result.ok) await loadData();
    }

    async function doDeleteRow(rowId) {
        const table = activeTable();
        if (!table || !client) return;
        const win = doc.defaultView || globalThis;
        if (!win.confirm(`确认删除 row_id=${rowId} 的行？`)) return;
        igsWriting = true;
        const result = await client.deleteRow(table.name, rowId);
        igsWriting = false;
        if (result.ok) await loadData();
    }

    function openModal(expandEl) {
        const [ri, ci] = expandEl.getAttribute('data-db-expand').split(':').map(Number);
        const table = activeTable();
        if (!table) return;
        const row = table.rows[ri];
        if (!row) return;
        const rowId = parseInt(row[0], 10);
        const colName = table.columns[ci];
        const origVal = String(row[ci] ?? '');
        closeModal();
        modalRoot = doc.createElement('div');
        modalRoot.className = 'igs-db-modal-bg';
        modalRoot.innerHTML = `<div class="igs-db-modal">`
            + `<div class="igs-db-modal-label">${esc(table.name)} · ${esc(colName)}</div>`
            + `<textarea>${esc(origVal)}</textarea>`
            + `<div class="igs-db-modal-btns">`
            + `<button class="igs-db-modal-cancel">取消</button>`
            + `<button class="igs-db-modal-save">保存</button>`
            + `</div></div>`;
        doc.body.appendChild(modalRoot);
        const textarea = modalRoot.querySelector('textarea');
        modalRoot.querySelector('.igs-db-modal-cancel').addEventListener('click', closeModal);
        modalRoot.querySelector('.igs-db-modal-save').addEventListener('click', async () => {
            const newVal = textarea.value;
            closeModal();
            if (newVal === origVal) return;
            igsWriting = true;
            row[ci] = newVal;
            render();
            const result = await client.updateCell(table.name, rowId, colName, newVal);
            igsWriting = false;
            if (!result.ok) { row[ci] = origVal; render(); }
            else await client.refresh();
        });
        textarea.focus();
    }

    function closeModal() { if (modalRoot) { modalRoot.remove(); modalRoot = null; } }

    function activeTable() { return state.tables.find(t => t.uid === state.activeUid) || state.tables[0] || null; }

    return { open, close, toggle };
}

function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
