import { BaseStreamQueueInterface, StreamQueueManager } from '../queue/stream_queue';
import { MemorySaver } from './memory/checkpoint';
import { MemoryStreamQueue } from './memory/queue';
import { MemoryThreadsManager } from './memory/threads';
import type { SqliteSaver as SqliteSaverType } from './sqlite/checkpoint';
import { SQLiteThreadsManager } from './sqlite/threads';

// 所有的适配实现，都请写到这里，通过环境变量进行判断使用哪种方式进行适配

export const createCheckPointer = async () => {
    if (
        (process.env.REDIS_URL && process.env.CHECKPOINT_TYPE === 'redis') ||
        process.env.CHECKPOINT_TYPE === 'shallow/redis'
    ) {
        if (process.env.CHECKPOINT_TYPE === 'redis') {
            const { RedisSaver } = await import('@langchain/langgraph-checkpoint-redis');
            return await RedisSaver.fromUrl(process.env.REDIS_URL!, {
                defaultTTL: 60, // TTL in minutes
                refreshOnRead: true,
            });
        }
        if (process.env.CHECKPOINT_TYPE === 'shallow/redis') {
            const { ShallowRedisSaver } = await import('@langchain/langgraph-checkpoint-redis/shallow');
            return await ShallowRedisSaver.fromUrl(process.env.REDIS_URL!);
        }
    }
    if (process.env.SQLITE_DATABASE_URI) {
        const { SqliteSaver } = await import('./sqlite/checkpoint');
        const db = SqliteSaver.fromConnString(process.env.SQLITE_DATABASE_URI);
        return db;
    }
    return new MemorySaver();
};

export const createMessageQueue = async () => {
    let q: new (id: string) => BaseStreamQueueInterface;
    if (process.env.REDIS_URL) {
        console.log('Using redis as stream queue');
        const { RedisStreamQueue } = await import('./redis/queue');
        q = RedisStreamQueue;
    } else {
        q = MemoryStreamQueue;
    }
    return new StreamQueueManager(q);
};

export const createThreadManager = (config: { checkpointer?: SqliteSaverType }) => {
    if (process.env.SQLITE_DATABASE_URI && config.checkpointer) {
        return new SQLiteThreadsManager(config.checkpointer);
    }
    return new MemoryThreadsManager();
};
