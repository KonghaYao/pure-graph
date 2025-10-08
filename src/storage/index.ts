import { BaseStreamQueueInterface, StreamQueueManager } from '../queue/stream_queue';
import { MemorySaver } from './memory/checkpoint';
import { MemoryStreamQueue } from './memory/queue';
import { MemoryThreadsManager } from './memory/threads';
import type { SqliteSaver as SqliteSaverType } from './sqlite/checkpoint';
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { SQLiteThreadsManager } from './sqlite/threads';

// 所有的适配实现，都请写到这里，通过环境变量进行判断使用哪种方式进行适配

export const createCheckPointer = async () => {
    if (
        (process.env.REDIS_URL && process.env.CHECKPOINT_TYPE === 'redis') ||
        process.env.CHECKPOINT_TYPE === 'shallow/redis'
    ) {
        if (process.env.CHECKPOINT_TYPE === 'redis') {
            console.debug('LG | Using redis as checkpoint');
            const { RedisSaver } = await import('@langchain/langgraph-checkpoint-redis');
            return await RedisSaver.fromUrl(process.env.REDIS_URL!, {
                defaultTTL: 60, // TTL in minutes
                refreshOnRead: true,
            });
        }
        if (process.env.CHECKPOINT_TYPE === 'shallow/redis') {
            console.debug('LG | Using shallow redis as checkpoint');
            const { ShallowRedisSaver } = await import('@langchain/langgraph-checkpoint-redis/shallow');
            return await ShallowRedisSaver.fromUrl(process.env.REDIS_URL!);
        }
    }

    if (process.env.DATABASE_URL) {
        console.debug('LG | Using postgres as checkpoint');
        const { createPGCheckpoint } = await import('./pg/checkpoint');
        return createPGCheckpoint();
    }

    if (process.env.SQLITE_DATABASE_URI) {
        console.debug('LG | Using sqlite as checkpoint');
        const { SqliteSaver } = await import('./sqlite/checkpoint');
        const db = SqliteSaver.fromConnString(process.env.SQLITE_DATABASE_URI);
        return db;
    }
    return new MemorySaver();
};

export const createMessageQueue = async () => {
    let q: new (id: string) => BaseStreamQueueInterface;
    if (process.env.REDIS_URL) {
        console.debug('LG | Using redis as stream queue');
        const { RedisStreamQueue } = await import('./redis/queue');
        q = RedisStreamQueue;
    } else {
        q = MemoryStreamQueue;
    }
    return new StreamQueueManager(q);
};

export const createThreadManager = async (config: { checkpointer?: SqliteSaverType | PostgresSaver }) => {
    if (process.env.DATABASE_URL && config.checkpointer) {
        const { PostgresThreadsManager } = await import('./pg/threads');
        const threadsManager = new PostgresThreadsManager(config.checkpointer as PostgresSaver);
        if (process.env.DATABASE_INIT === 'true') {
            await threadsManager.setup();
        }
        return threadsManager;
    }
    if (process.env.SQLITE_DATABASE_URI && config.checkpointer) {
        const threadsManager = new SQLiteThreadsManager(config.checkpointer as SqliteSaverType);
        await threadsManager.setup();
        return threadsManager;
    }
    return new MemoryThreadsManager();
};
