export * from '../src/index.js';
import { bootstrapIGS } from '../src/index.js';
const globalObject = globalThis.window || globalThis;
if (globalObject && globalObject.IGS_AUTO_BOOTSTRAP !== false && !globalObject.IGS) {
    bootstrapIGS({ global: globalObject });
}
