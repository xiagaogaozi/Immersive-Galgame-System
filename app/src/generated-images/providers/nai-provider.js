export const naiProvider = {
    id: 'igs.provider.nai',
    type: 'image-provider',
    providerType: 'nai',
    label: 'NAI',
    permissions: ['network'],

    async detect(context = {}) {
        return !!(context.settings && context.settings.nai);
    },

    async generate(request) {
        return {
            ok: false,
            reason: 'not-implemented',
            request,
        };
    },

    async poll(task) {
        return task;
    },

    extractImages() {
        return [];
    },
};
