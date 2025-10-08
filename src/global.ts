import { createCheckPointer, createMessageQueue, createThreadManager } from './storage/index.js';
import type { SqliteSaver } from './storage/sqlite/checkpoint.js';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
const [globalMessageQueue, globalCheckPointer] = await Promise.all([createMessageQueue(), createCheckPointer()]);
const globalThreadsManager = await createThreadManager({
    checkpointer: globalCheckPointer as SqliteSaver | PostgresSaver,
});
export class LangGraphGlobal {
    static globalMessageQueue = globalMessageQueue;
    static globalCheckPointer = globalCheckPointer;
    static globalThreadsManager = globalThreadsManager;
}
