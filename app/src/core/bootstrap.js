import { createPublicApi, attachPublicApi, detachPublicApi } from '../api/public-api.js';
import { createTavernHelperAdapter } from '../host/tavern-helper-adapter.js';
import { createInputChannel } from '../host/input-channel.js';
import { parseSceneText } from '../scene/text-parser.js';
import { createSceneState } from '../scene/scene-state.js';
import { resolveScene } from '../scene/scene-resolver.js';
import { createLayerController } from '../visual/layer-controller.js';
import { createStageRenderer } from '../visual/stage-renderer.js';
import { resolveVisualMode } from '../visual/visual-mode.js';
import { createEventBus } from './event-bus.js';

export function bootstrapIGS(options = {}) {
    const globalObject = options.global || globalThis.window || globalThis;
    const events = options.events || createEventBus();
    const hostAdapter = options.hostAdapter || createTavernHelperAdapter(globalObject);
    const inputChannel = createInputChannel(hostAdapter);
    const layerController = options.layerController || createLayerController(options.layers || {});
    const renderer = options.renderer || createStageRenderer(layerController);
    const state = {
        status: 'booting',
        config: options.config || {},
        currentScene: createSceneState(),
        lastRender: null,
        destroyed: false,
    };

    const app = {
        version: '0.2.1',
        events,
        refresh,
        typeAndSend,
        getState,
        destroy,
    };
    const publicApi = createPublicApi(app);
    attachPublicApi(globalObject, publicApi);
    state.status = 'ready';
    events.emit('igs:ready', publicApi);

    return publicApi;

    async function refresh(context = {}) {
        ensureAlive();
        const message = context.message || (await hostAdapter.getCurrentMessage());
        const textScene = context.textScene || parseSceneText(getMessageText(message), {
            messageId: message && message.id,
        });
        const scene = resolveScene({
            ...context,
            previousScene: state.currentScene,
            textScene,
        });
        const visualMode = resolveVisualMode(scene, context.visualSettings || state.config.visual || {});
        const renderedScene = createSceneState({ ...scene, visualMode });
        const renderResult = renderer.render(renderedScene);
        state.currentScene = renderedScene;
        state.lastRender = renderResult;
        events.emit('igs:scene', renderedScene);
        return { ok: true, scene: renderedScene, render: renderResult };
    }

    async function typeAndSend(text) {
        ensureAlive();
        return inputChannel.typeAndSend(text);
    }

    function getState() {
        return {
            status: state.status,
            config: state.config,
            currentScene: state.currentScene,
            lastRender: state.lastRender,
            destroyed: state.destroyed,
        };
    }

    function destroy() {
        if (state.destroyed) return { ok: true, reason: 'already-destroyed' };
        state.destroyed = true;
        state.status = 'destroyed';
        detachPublicApi(globalObject, publicApi);
        events.emit('igs:destroy', publicApi);
        events.clear();
        return { ok: true };
    }

    function ensureAlive() {
        if (state.destroyed) {
            throw new Error('IGS instance has been destroyed.');
        }
    }
}

export function destroyIGS(globalObject = globalThis.window || globalThis) {
    if (globalObject && globalObject.IGS && typeof globalObject.IGS.destroy === 'function') {
        return globalObject.IGS.destroy();
    }
    return { ok: true, reason: 'not-running' };
}

function getMessageText(message) {
    if (typeof message === 'string') return message;
    if (!message || typeof message !== 'object') return '';
    return message.text || message.message || message.content || message.mes || '';
}
