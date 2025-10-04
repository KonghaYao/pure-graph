import { CancelEventMessage, EventMessage } from '../../queue/event_message.js';
import { BaseStreamQueue } from '../../queue/stream_queue.js';
import { BaseStreamQueueInterface } from '../../queue/stream_queue.js';
import Redis from 'ioredis';

/**
 * Redis 实现的消息队列，用于存储消息
 */
export class RedisStreamQueue extends BaseStreamQueue implements BaseStreamQueueInterface {
    static redis = new Redis(process.env.REDIS_URL!);
    static subscriberRedis = new Redis(process.env.REDIS_URL!);
    private redis: Redis;
    private subscriberRedis: Redis;
    private queueKey: string;
    private channelKey: string;
    private isConnected = false;
    public cancelSignal: AbortController;

    constructor(readonly id: string = 'default') {
        super(id, true);
        this.queueKey = `queue:${this.id}`;
        this.channelKey = `channel:${this.id}`;
        this.redis = RedisStreamQueue.redis;
        this.subscriberRedis = RedisStreamQueue.subscriberRedis;
        this.cancelSignal = new AbortController();
    }

    /**
     * 推送消息到 Redis 队列
     */
    async push(item: EventMessage): Promise<void> {
        const data = await this.encodeData(item);
        const serializedData = Buffer.from(data);

        // 推送到队列
        await this.redis.lpush(this.queueKey, serializedData);

        // 发布到频道通知有新数据
        await this.redis.publish(this.channelKey, serializedData);

        this.emit('dataChange', data);
    }

    /**
     * 异步生成器：支持 for await...of 方式消费队列数据
     */
    async *onDataReceive(): AsyncGenerator<EventMessage, void, unknown> {
        let queue: EventMessage[] = [];
        let pendingResolve: (() => void) | null = null;
        let isStreamEnded = false;
        const handleMessage = async (message: string) => {
            const data = (await this.decodeData(message)) as EventMessage;
            queue.push(data);
            // 检查是否为流结束或错误信号
            if (
                data.event === '__stream_end__' ||
                data.event === '__stream_error__' ||
                data.event === '__stream_cancel__'
            ) {
                setTimeout(() => {
                    isStreamEnded = true;
                    if (pendingResolve) {
                        pendingResolve();
                        pendingResolve = null;
                    }
                }, 300);

                if (data.event === '__stream_cancel__') {
                    this.cancel();
                }
            }

            if (pendingResolve) {
                pendingResolve();
                pendingResolve = null;
            }
        };

        // 订阅 Redis 频道
        await this.subscriberRedis.subscribe(this.channelKey);
        this.subscriberRedis.on('message', (channel, message) => {
            if (channel === this.channelKey) {
                handleMessage(message);
            }
        });

        try {
            while (!isStreamEnded) {
                if (queue.length > 0) {
                    for (const item of queue) {
                        yield item;
                    }
                    queue = [];
                } else {
                    await new Promise((resolve) => {
                        pendingResolve = resolve as () => void;
                    });
                }
            }
        } finally {
            await this.subscriberRedis.unsubscribe(this.channelKey);
        }
    }

    /**
     * 获取队列中的所有数据
     */
    async getAll(): Promise<EventMessage[]> {
        const data = await this.redis.lrange(this.queueKey, 0, -1);

        if (this.compressMessages) {
            return (await Promise.all(
                data.map(async (item: string) => {
                    const parsed = JSON.parse(item) as EventMessage;
                    return (await this.decodeData(parsed as any)) as EventMessage;
                }),
            )) as EventMessage[];
        } else {
            return data.map((item) => JSON.parse(item) as EventMessage);
        }
    }

    /**
     * 清空队列
     */
    clear(): void {
        if (this.isConnected) {
            this.redis.del(this.queueKey);
        }
    }

    /**
     * 取消操作
     */
    cancel(): void {
        this.push(new CancelEventMessage());
        this.cancelSignal.abort('user cancel this run');
    }
}
