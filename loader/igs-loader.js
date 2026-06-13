(function () {
    'use strict';

    const REPOSITORY = 'xiagaogaozi/immersive-galgame-system';
    const DEFAULT_REF = 'v0.3.3';
    const RAW_MANIFEST_URL = `https://raw.githubusercontent.com/${REPOSITORY}/main/app/dist/manifest.json`;
    const INSTANCE_KEY = '__IGS_AUTO_UPDATE_LOADER__';
    const CSS_ID = 'igs-auto-loader-css';
    const SCRIPT_ID = 'igs-auto-loader-js';
    const TRACE_IDS = [CSS_ID, SCRIPT_ID, 'igs-root', 'igs-stage'];

    const root = resolveRootWindow();
    const doc = getRootDocument();

    if (!doc) {
        console.warn('[IGS Loader] 未找到可访问的文档，无法加载沉浸式 Galgame 系统。');
        return;
    }

    const existingRuntime = reconcileExistingRuntime();
    if (existingRuntime.done) {
        return;
    }

    root[INSTANCE_KEY] = {
        repository: REPOSITORY,
        loadedAt: Date.now(),
    };

    load().catch((error) => {
        console.error('[IGS Loader] 启动失败。', error);
        try {
            if (typeof root.alert === 'function') root.alert(`沉浸式 Galgame 系统启动失败：${error && error.message || String(error)}`);
        } catch (alertError) {
            // Ignore blocked alert calls.
        }
    });

    function resolveRootWindow() {
        try {
            if (window.parent && window.parent.document) return window.parent;
        } catch (error) {
            // Cross-origin parent is not usable inside Tavern.
        }
        return window;
    }

    function getRootDocument() {
        try {
            return root.document || document;
        } catch (error) {
            return document;
        }
    }

    async function load() {
        const config = await resolveLoaderConfig();
        const attempts = buildLoadAttempts(config);
        let lastError = null;

        for (const attempt of attempts) {
            const cssUrl = withCacheBust(`${attempt.base}/app/dist/igs.bundle.css`, attempt);
            const scriptUrl = withCacheBust(`${attempt.base}/app/dist/igs.bundle.js`, attempt);
            const probe = await probeBundleUrl(scriptUrl);
            if (!probe.ok) {
                lastError = probe.error || new Error(`remote bundle not available: ${scriptUrl}`);
                console.warn('[IGS Loader] 远程 bundle 探测失败，尝试下一个地址。', attempt.ref, scriptUrl, lastError);
                continue;
            }
            try {
                injectCss(cssUrl);
                await injectScript(scriptUrl);
                scheduleMagicWandEnsure();
                console.info('[IGS Loader] 使用远程版本。', attempt.ref, attempt.base);
                return { ...config, activeRef: attempt.ref, activeBase: attempt.base };
            } catch (error) {
                lastError = error;
                clearTraceElements();
                console.warn('[IGS Loader] 远程 bundle 加载失败，尝试下一个地址。', attempt.ref, scriptUrl, error);
            }
        }

        throw lastError || new Error('没有可用的沉浸式 Galgame 系统远程 bundle。');
    }

    async function resolveLoaderConfig() {
        const userConfig = getObject(root.IGS_LOADER_CONFIG);
        const explicitRef = String(userConfig.ref || root.IGS_LOADER_REF || '').trim();
        const ref = explicitRef || await resolveLatestTagRef(userConfig) || DEFAULT_REF;
        const defaultBase = `https://cdn.jsdelivr.net/gh/${REPOSITORY}@${ref}`;
        const hasCustomBase = Boolean(userConfig.base || root.IGS_LOADER_BASE);
        const base = String(userConfig.base || root.IGS_LOADER_BASE || defaultBase).replace(/\/+$/, '');
        const cacheBust = userConfig.cacheBust === undefined ? ref === 'main' || Boolean(explicitRef && !/^v\d+\.\d+\.\d+$/.test(ref)) : userConfig.cacheBust !== false;
        return { ref, base, cacheBust, hasCustomBase };
    }

    function buildLoadAttempts(config) {
        const attempts = [
            {
                ref: config.ref,
                base: config.base,
                cacheBust: config.cacheBust,
            },
        ];
        if (!config.hasCustomBase && config.ref !== 'main') {
            attempts.push({
                ref: 'main',
                base: `https://cdn.jsdelivr.net/gh/${REPOSITORY}@main`,
                cacheBust: true,
                fallbackOf: config.ref,
            });
        }
        return attempts;
    }

    async function resolveLatestTagRef(userConfig) {
        if (userConfig.autoUpdate === false || root.IGS_LOADER_AUTO_UPDATE === false) return DEFAULT_REF;
        const manifestUrl = withCacheBust(String(userConfig.manifestUrl || root.IGS_LOADER_MANIFEST_URL || RAW_MANIFEST_URL), { cacheBust: true });
        const fetchFn = root.fetch
            ? root.fetch.bind(root)
            : (typeof fetch === 'function' ? fetch : null);
        if (!fetchFn) return DEFAULT_REF;
        try {
            const response = await fetchFn(manifestUrl, { cache: 'no-store' });
            if (!response || !response.ok) return DEFAULT_REF;
            const manifest = await response.json();
            const version = manifest && typeof manifest.version === 'string' ? manifest.version.trim() : '';
            return /^\d+\.\d+\.\d+$/.test(version) ? `v${version}` : DEFAULT_REF;
        } catch (error) {
            console.warn('[IGS Loader] 读取 manifest 失败，回退到内置版本。', error);
            return DEFAULT_REF;
        }
    }

    function getObject(value) {
        return value && typeof value === 'object' ? value : {};
    }

    function withCacheBust(url, config) {
        if (!config.cacheBust) return url;
        const mark = `igs_t=${Date.now()}`;
        return `${url}${url.includes('?') ? '&' : '?'}${mark}`;
    }

    async function probeBundleUrl(url) {
        const fetchFn = root.fetch
            ? root.fetch.bind(root)
            : (typeof fetch === 'function' ? fetch : null);
        if (!fetchFn) return { ok: true, skipped: true };
        try {
            const response = await fetchFn(url, { method: 'HEAD', cache: 'no-store' });
            return response && response.ok
                ? { ok: true }
                : { ok: false, error: new Error(`HTTP ${response && response.status || 'unknown'}`) };
        } catch (error) {
            return { ok: false, error };
        }
    }

    function injectCss(href) {
        let link = doc.querySelector(`#${CSS_ID}`);
        if (!link) {
            link = doc.createElement('link');
            link.id = CSS_ID;
            link.rel = 'stylesheet';
            doc.head.appendChild(link);
        }
        link.href = href;
    }

    function injectScript(src) {
        const existing = doc.querySelector(`#${SCRIPT_ID}`);
        if (existing && existing.src === src) return Promise.resolve(existing);
        if (existing && existing.remove) existing.remove();
        return new Promise((resolve, reject) => {
            const script = doc.createElement('script');
            script.id = SCRIPT_ID;
            script.type = 'module';
            script.src = src;
            script.onload = () => {
                console.info('[IGS Loader] 沉浸式 Galgame 系统 bundle 已加载。', src);
                resolve(script);
            };
            script.onerror = () => {
                reject(new Error(`remote script load failed: ${src}`));
            };
            doc.head.appendChild(script);
        });
    }

    function reconcileExistingRuntime() {
        const api = root.IGS || root.ImmersiveGalgameSystem;
        if (api && typeof api.ensureMagicWandEntry === 'function') {
            const result = safeEnsureMagicWandEntry(api);
            root[INSTANCE_KEY] = {
                repository: REPOSITORY,
                loadedAt: Date.now(),
                status: 'ready',
                reused: true,
                magicWandEntry: result,
            };
            console.info('[IGS Loader] 沉浸式 Galgame 系统已加载，已重扫魔法棒入口。', result);
            scheduleMagicWandEnsure();
            return { done: true, reason: 'reused-existing-runtime' };
        }

        if (api) {
            console.warn('[IGS Loader] 检测到旧版 IGS 残留，准备重新加载。');
            try {
                if (typeof api.destroy === 'function') api.destroy();
            } catch (error) {
                console.warn('[IGS Loader] 旧版 IGS 销毁失败，继续清理残留。', error);
            }
            clearGlobalApi(api);
        }

        const staleTrace = root[INSTANCE_KEY] || TRACE_IDS.find((id) => doc.querySelector(`#${id}`));
        if (staleTrace) {
            console.info('[IGS Loader] 清理旧 loader 残留后重新加载。', staleTrace);
            clearTraceElements();
            try {
                delete root[INSTANCE_KEY];
            } catch (error) {
                root[INSTANCE_KEY] = null;
            }
        }

        return { done: false };
    }

    function safeEnsureMagicWandEntry(api) {
        try {
            return api.ensureMagicWandEntry();
        } catch (error) {
            console.warn('[IGS Loader] 重扫魔法棒入口失败。', error);
            return { ok: false, reason: error && error.message || String(error) };
        }
    }

    function scheduleMagicWandEnsure() {
        let attempts = 0;
        const maxAttempts = 20;
        const tick = () => {
            attempts += 1;
            const api = root.IGS || root.ImmersiveGalgameSystem;
            if (api && typeof api.ensureMagicWandEntry === 'function') {
                const result = safeEnsureMagicWandEntry(api);
                if (result && result.ok) return;
            }
            if (attempts < maxAttempts) {
                setHostTimeout(tick, 500);
            }
        };
        setHostTimeout(tick, 0);
    }

    function clearGlobalApi(api) {
        try {
            if (root.IGS === api) delete root.IGS;
        } catch (error) {
            root.IGS = undefined;
        }
        try {
            if (root.ImmersiveGalgameSystem === api) delete root.ImmersiveGalgameSystem;
        } catch (error) {
            root.ImmersiveGalgameSystem = undefined;
        }
    }

    function clearTraceElements() {
        for (const id of TRACE_IDS) {
            const element = doc.querySelector(`#${id}`);
            if (element && element.remove) element.remove();
        }
    }

    function setHostTimeout(callback, ms) {
        const setter = root && typeof root.setTimeout === 'function'
            ? root.setTimeout.bind(root)
            : setTimeout;
        setter(callback, ms);
    }
})();
