import { collectDomImageCandidates, resolveDomRoots } from '../dom-image-candidates.js';

export const chamiProvider = Object.freeze({
    id: 'builtin.chami',
    label: 'chami_tavern-scene-plugin',
    type: 'image-provider',
    providerType: 'extension-dom',
    adapterKey: 'chami',
    builtin: true,
    detachable: true,
    defaultPresetType: 'image-provider-preset',
    permissions: [],
    async detect(context) {
        return collectDomImageCandidates(resolveDomRoots(context), {
            adapterKeys: ['chami'],
        }).length > 0;
    },
    async generate() {
        return { ok: false, reason: 'external-provider' };
    },
    async poll(task) {
        return task || null;
    },
    extractImages(messageContext) {
        return collectDomImageCandidates(resolveDomRoots(messageContext), {
            adapterKeys: ['chami'],
        }).map((candidate) => ({
            url: candidate.url,
            providerId: 'builtin.chami',
            source: 'provider-dom',
            imageId: candidate.imageId,
            locationHash: candidate.locationHash,
            slotIndex: candidate.slotIndex,
            buttonIndex: candidate.buttonIndex,
            order: candidate.order,
        }));
    },
});
