export const REQUIRED_VISUAL_SLOTS = Object.freeze([
    '.vn-stage',
    '.vn-background-layer',
    '.vn-generated-layer',
    '.vn-character-layer',
    '.vn-dialogue-layer',
    '.vn-hud-layer',
    '.vn-toolbar',
    '.vn-choice-layer',
    '.vn-system-layer',
]);

export const REQUIRED_READER_BRIDGE = Object.freeze([
    'data-vn-toolbar-layout',
    'data-vn-toolbar-placement',
    'data-vn-dialogue-style',
    'data-vn-nameplate-visible',
    'data-vn-avatar-visible',
]);

export function checkStyleContract(target = {}) {
    const missingSlots = REQUIRED_VISUAL_SLOTS.filter((selector) => !hasSelector(target, selector));
    const missingData = REQUIRED_READER_BRIDGE.filter((name) => !hasDataBridge(target, name));

    return {
        ok: missingSlots.length === 0 && missingData.length === 0,
        missingSlots,
        missingData,
    };
}

function hasSelector(target, selector) {
    if (typeof target.querySelector === 'function') return !!target.querySelector(selector);
    return Array.isArray(target.slots) && target.slots.includes(selector);
}

function hasDataBridge(target, name) {
    if (target.datasetKeys && target.datasetKeys.includes(name)) return true;
    if (target.attributes && Object.prototype.hasOwnProperty.call(target.attributes, name)) return true;
    return false;
}
