import { createCheckPointer, createMessageQueue, createThreadManager } from './storage/index.js';
import type { SqliteSaver } from './storage/sqlite/checkpoint.js';
const [globalMessageQueue, globalCheckPointer] = await Promise.all([createMessageQueue(), createCheckPointer()]);
const globalThreadsManager = await createThreadManager({
    checkpointer: globalCheckPointer as SqliteSaver,
});
export class LangGraphGlobal {
    static globalMessageQueue = globalMessageQueue;
    static globalCheckPointer = globalCheckPointer;
    static globalThreadsManager = globalThreadsManager;
}
