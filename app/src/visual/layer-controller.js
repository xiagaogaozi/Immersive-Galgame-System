export function createLayerController(layers) {
    return {
        render(scene) {
            for (const layer of Object.values(layers || {})) {
                if (layer && typeof layer.render === 'function') {
                    layer.render(scene);
                }
            }
            return { ok: true };
        },
    };
}
