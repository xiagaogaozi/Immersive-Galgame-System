export function createShujukuClient(api) {
    return {
        async readSceneData() {
            if (!api || typeof api.getSceneData !== 'function') {
                return { ok: false, reason: 'missing-shujuku-api' };
            }
            return { ok: true, data: await api.getSceneData() };
        },

        async updateRowAndRefresh(tableName, rowIndex, patch) {
            if (!api || typeof api.updateRow !== 'function') {
                return { ok: false, reason: 'missing-update-row' };
            }
            const updateResult = await api.updateRow(tableName, rowIndex, patch);
            if (!isSuccessful(updateResult)) {
                return { ok: false, reason: 'update-row-failed', result: updateResult };
            }
            if (typeof api.refreshDataAndWorldbook === 'function') {
                const refreshResult = await api.refreshDataAndWorldbook();
                if (!isSuccessful(refreshResult)) {
                    return { ok: false, reason: 'refresh-worldbook-failed', result: refreshResult };
                }
            }
            return { ok: true, tableName, rowIndex, patch };
        },
    };
}

function isSuccessful(result) {
    if (result == null || result === false || result === -1) return false;
    if (typeof result === 'object' && result.success === false) return false;
    return true;
}
