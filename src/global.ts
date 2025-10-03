import { createCheckPointer, createMessageQueue, createThreadManager } from './storage/index.js';
import type { SqliteSaver } from './storage/sqlite/checkpoint.js';
const globalCheckPointer = await createCheckPointer();
const globalThreadsManager = await createThreadManager({
    checkpointer: globalCheckPointer as SqliteSaver,
});
export class LangGraphGlobal {
    static globalMessageQueue = createMessageQueue();
    static globalCheckPointer = globalCheckPointer;
    static globalThreadsManager = globalThreadsManager;
}
