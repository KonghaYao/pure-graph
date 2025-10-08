/** @ts-ignore */
import type { NextRequest } from 'next/server';
declare global {
    var LG_INIT_PROMISE:
        | Promise<{
              GET: (req: NextRequest) => Promise<any>;
              POST: (req: NextRequest) => Promise<any>;
              DELETE: (req: NextRequest) => Promise<any>;
          }>
        | undefined;
}
/**
 * Lazy initialization of LangGraph
 *
 * Background:
 * In Next.js, if you use top-level await to initialize directly in a module,
 * initialization will be performed once for each context.
 * Even if you use globalThis for caching, it is ineffective because globalThis is isolated per context.
 *
 * Solution:
 * 1. Remove top-level await and switch to lazy initialization during request handling.
 * 2. Use a Promise cache to ensure initialization only happens once per context.
 * 3. Concurrent requests will share the same initialization Promise, avoiding redundant initialization.
 */
export async function ensureInitialized(attachGraphPromise: () => Promise<void>) {
    if (globalThis.LG_INIT_PROMISE === undefined) {
        globalThis.LG_INIT_PROMISE = (async () => {
            await attachGraphPromise();
            const { GET, POST, DELETE } = await import('./router');
            return {
                GET,
                POST,
                DELETE,
            };
        })();
    }
    return globalThis.LG_INIT_PROMISE;
}
