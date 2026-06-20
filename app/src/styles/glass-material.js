export const IGS_TRANSPARENT_GLASS_ALPHA = 0.62;
export const IGS_TRANSPARENT_GLASS_BG = `rgba(20,20,22,${IGS_TRANSPARENT_GLASS_ALPHA})`;

export function normalizeGlassDensity(value, fallback = IGS_TRANSPARENT_GLASS_ALPHA) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(1, Math.max(0, numeric));
}

export function createTransparentGlassBg(density) {
    return `rgba(20,20,22,${normalizeGlassDensity(density)})`;
}

export function applyTransparentGlassMaterial(target, density) {
    const style = target && target.style ? target.style : target;
    if (!style || typeof style.setProperty !== 'function') return;
    const normalizedDensity = normalizeGlassDensity(density);
    const glassBg = createTransparentGlassBg(normalizedDensity);
    style.setProperty('--igs-glass-opacity', String(normalizedDensity));
    style.setProperty('--igs-glass-density', String(normalizedDensity));
    style.setProperty('--igs-glass-fill-alpha', String(normalizedDensity));
    style.setProperty('--igs-transparent-glass-bg', glassBg);
    style.setProperty('--igs-glass-bg', glassBg);
    style.setProperty('--igs-dialog-bg', glassBg);
    style.setProperty('--igs-toolbar-bg', glassBg);
    style.setProperty('--igs-choice-bg', glassBg);
    style.setProperty('--igs-db-bg', glassBg);
}
