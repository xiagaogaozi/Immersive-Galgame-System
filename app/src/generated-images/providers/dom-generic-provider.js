import { collectDomImageCandidates, resolveDomRoots } from '../dom-image-candidates.js';

export const domGenericProvider = Object.freeze({
    id: 'builtin.dom-generic',
    label: 'dom-generic',
    type: 'image-provider',
    providerType: 'extension-dom',
    adapterKey: 'generic',
    builtin: true,
    detachable: false,
    permissions: [],

    async detect(context) {
        return collectDomImageCandidates(resolveDomRoots(context), {
            adapterKeys: ['generic'],
            scopePolicy: context.scopePolicy,
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
            adapterKeys: ['generic'],
            scopePolicy: messageContext.scopePolicy,
        }).map((candidate) => ({
            url: candidate.url,
            providerId: 'builtin.dom-generic',
            source: 'provider-dom',
            imageId: candidate.imageId,
            locationHash: candidate.locationHash,
            slotIndex: candidate.slotIndex,
            buttonIndex: candidate.buttonIndex,
            order: candidate.order,
        }));
    },
});
