export const IGS_TRANSPARENT_GLASS_ALPHA = 0.12;
export const IGS_TRANSPARENT_GLASS_BG = `rgba(20,20,22,${IGS_TRANSPARENT_GLASS_ALPHA})`;

export function normalizeGlassDensity(value, fallback = IGS_TRANSPARENT_GLASS_ALPHA) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(1, Math.max(0, numeric));
}

export function applyTransparentGlassMaterial(target, density) {
    const style = target && target.style ? target.style : target;
    if (!style || typeof style.setProperty !== 'function') return;
    const normalizedDensity = normalizeGlassDensity(density);
    style.setProperty('--igs-glass-opacity', String(normalizedDensity));
    style.setProperty('--igs-glass-density', String(normalizedDensity));
    style.setProperty('--igs-glass-fill-alpha', String(IGS_TRANSPARENT_GLASS_ALPHA));
    style.setProperty('--igs-transparent-glass-bg', IGS_TRANSPARENT_GLASS_BG);
    style.setProperty('--igs-glass-bg', IGS_TRANSPARENT_GLASS_BG);
}
