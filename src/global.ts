import { createCheckPointer, createMessageQueue, createThreadManager } from './storage/index.js';
import type { SqliteSaver } from './storage/sqlite/checkpoint.js';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
const [globalMessageQueue, globalCheckPointer] = await Promise.all([createMessageQueue(), createCheckPointer()]);
console.debug('LG | checkpointer created');
const globalThreadsManager = await createThreadManager({
    checkpointer: globalCheckPointer as SqliteSaver | PostgresSaver,
});
console.debug('LG | threads manager created');
console.debug('LG | global init done');
export class LangGraphGlobal {
    static globalMessageQueue = globalMessageQueue;
    static globalCheckPointer = globalCheckPointer;
    static globalThreadsManager = globalThreadsManager;
}
