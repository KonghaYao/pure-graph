import { createCheckPointer, createMessageQueue } from './storage/index.js';

/** 全局队列管理器 */
export const globalMessageQueue = createMessageQueue();
/** 全局 Checkpointer */
export const globalCheckPointer = createCheckPointer();
