import { StreamQueueManager } from '../queue/stream-queue';
import { MemorySaver } from './memory/checkpoint';
import { MemoryStreamQueue } from './memory/queue';

// 所有的适配实现，都请写到这里，通过环境变量进行判断使用哪种方式进行适配

export const createCheckPointer = () => {
    return new MemorySaver();
};

export const createMessageQueue = () => {
    const q: new (compressMessages: boolean) => MemoryStreamQueue = MemoryStreamQueue;
    return new StreamQueueManager(q);
};
