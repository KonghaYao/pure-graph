import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import { BaseStreamQueueInterface, StreamQueueManager } from './queue/stream_queue.js';
import { createCheckPointer, createMessageQueue, createThreadManager } from './storage/index.js';
import type { SqliteSaver } from './storage/sqlite/checkpoint.js';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { BaseThreadsManager } from './threads/index.js';

export class LangGraphGlobal {
    static globalMessageQueue: StreamQueueManager<BaseStreamQueueInterface> = null as any;
    static globalCheckPointer: BaseCheckpointSaver = null as any;
    static globalThreadsManager: BaseThreadsManager = null as any;
    static isInitialized = false;
    static async initGlobal() {
        if (LangGraphGlobal.isInitialized) {
            return;
        }
        const [globalMessageQueue, globalCheckPointer] = await Promise.all([
            createMessageQueue(),
            createCheckPointer(),
        ]);
        console.debug('LG | checkpointer created');
        const globalThreadsManager = await createThreadManager({
            checkpointer: globalCheckPointer as SqliteSaver | PostgresSaver,
        });
        console.debug('LG | threads manager created');
        console.debug('LG | global init done');
        LangGraphGlobal.globalMessageQueue = globalMessageQueue;
        LangGraphGlobal.globalCheckPointer = globalCheckPointer;
        LangGraphGlobal.globalThreadsManager = globalThreadsManager;
        LangGraphGlobal.isInitialized = true;
    }
}
