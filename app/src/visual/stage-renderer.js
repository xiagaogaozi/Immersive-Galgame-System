export function createStageRenderer(layerController) {
    if (!layerController || typeof layerController.render !== 'function') {
        throw new Error('IGS stage renderer requires a layer controller.');
    }

    return {
        render(scene) {
            return layerController.render(scene);
        },
    };
}
