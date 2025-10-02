import { createCheckPointer, createMessageQueue, createThreadManager } from './storage/index.js';
import type { SqliteSaver } from './storage/sqlite/checkpoint.js';

/** 全局队列管理器 */
export const globalMessageQueue = createMessageQueue();
/** 全局 Checkpointer */
export const globalCheckPointer = await createCheckPointer();

export const globalThreadsManager = await createThreadManager({
    checkpointer: globalCheckPointer as SqliteSaver,
});
