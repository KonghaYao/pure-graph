import { EventEmitter } from 'eventemitter3';
import { JsonPlusSerializer } from './JsonPlusSerializer.js';
import { EventMessage } from './event_message.js';

/**
 * 流队列事件接口
 * Stream queue events interface
 */
interface StreamQueueEvents<T extends EventMessage> {
    /** 数据事件：当有新数据时触发 / Data event: triggered when new data arrives */
    data: (data: T) => void;
    /** 其他事件 / Other events */
    [key: string]: ((...args: any[]) => void) | undefined;
}

/**
 * 基础流队列类
 * Base stream queue class
 */
export class BaseStreamQueue extends EventEmitter<StreamQueueEvents<EventMessage>> {
    /** 序列化器实例 / Serializer instance */
    serializer = new JsonPlusSerializer();

    /**
     * 构造函数
     * Constructor
     * @param compressMessages 是否压缩消息 / Whether to compress messages
     */
    constructor(readonly compressMessages: boolean = true) {
        super();
    }

    /**
     * 编码数据为 Uint8Array
     * Encode data to Uint8Array
     * @param message 要编码的消息 / Message to encode
     * @returns 编码后的 Uint8Array / Encoded Uint8Array
     */
    async encodeData(message: EventMessage): Promise<Uint8Array> {
        const [_, serializedMessage] = await this.serializer.dumpsTyped(message);
        return serializedMessage;
    }

    /**
     * 解码数据为 EventMessage
     * Decode data to EventMessage
     * @param serializedMessage 要解码的消息 / Message to decode
     * @returns 解码后的 EventMessage / Decoded EventMessage
     */
    async decodeData(serializedMessage: string | Uint8Array): Promise<EventMessage> {
        const message = (await this.serializer.loadsTyped('json', serializedMessage)) as EventMessage;
        return message;
    }
}

/**
 * 基础流队列接口
 * Base stream queue interface
 */
export interface BaseStreamQueueInterface {
    /** 是否压缩消息 / Whether to compress messages */
    compressMessages: boolean;
    /**
     * 推送数据项到队列
     * Push item to queue
     * @param item 要推送的数据项 / Item to push
     */
    push(item: EventMessage): Promise<void>;
    /** 获取所有数据 / Get all data */
    getAll(): Promise<EventMessage[]>;
    /** 清空队列 / Clear queue */
    clear(): void;
    /**
     * 监听数据变化
     * Listen for data changes
     * @param listener 数据变化监听器 / Data change listener
     * @returns 取消监听函数 / Unsubscribe function
     */
    onDataChange(listener: (data: EventMessage) => void): () => void;
    /** 取消信号控制器 / Cancel signal controller */
    cancelSignal: AbortController;
    /** 取消操作 / Cancel operation */
    cancel(): void;
}

/**
 * StreamQueue 管理器，通过 id 管理多个队列实例
 * StreamQueue manager, manages multiple queue instances by id
 */
export class StreamQueueManager<Q extends BaseStreamQueueInterface> {
    /** 存储队列实例的 Map / Map storing queue instances */
    private queues: Map<string, Q> = new Map();
    /** 默认是否压缩消息 / Default compress messages setting */
    private defaultCompressMessages: boolean;
    /** 队列构造函数 / Queue constructor */
    private queueConstructor: new (compressMessages: boolean) => Q;

    /**
     * 构造函数
     * Constructor
     * @param queueConstructor 队列构造函数 / Queue constructor
     * @param options 配置选项 / Configuration options
     */
    constructor(
        queueConstructor: new (compressMessages: boolean) => Q,
        options: {
            /** 默认是否压缩消息 / Default compress messages setting */
            defaultCompressMessages?: boolean;
        } = {},
    ) {
        this.defaultCompressMessages = options.defaultCompressMessages ?? true;
        this.queueConstructor = queueConstructor;
    }

    /**
     * 创建指定 id 的队列
     * Create queue with specified id
     * @param id 队列 ID / Queue ID
     * @param compressMessages 是否压缩消息 / Whether to compress messages
     * @returns 创建的队列实例 / Created queue instance
     */
    createQueue(id: string, compressMessages?: boolean): Q {
        const compress = compressMessages ?? this.defaultCompressMessages;
        this.queues.set(id, new this.queueConstructor(compress));
        return this.queues.get(id)!;
    }

    /**
     * 获取或创建指定 id 的队列
     * Get or create queue with specified id
     * @param id 队列 ID / Queue ID
     * @param compressMessages 是否压缩消息，默认为构造函数中的默认值 / Whether to compress messages, defaults to constructor default
     * @returns StreamQueue 实例 / StreamQueue instance
     */
    getQueue(id: string): Q {
        const queue = this.queues.get(id);
        if (!queue) {
            throw new Error(`Queue with id '${id}' does not exist`);
        }
        return queue;
    }

    /**
     * 取消指定 id 的队列
     * Cancel queue with specified id
     * @param id 队列 ID / Queue ID
     */
    cancelQueue(id: string): void {
        const queue = this.queues.get(id);
        if (queue) {
            queue.cancel();
            this.removeQueue(id);
        }
    }
    /**
     * 向指定 id 的队列推送数据
     * Push data to queue with specified id
     * @param id 队列 ID / Queue ID
     * @param item 要推送的数据项 / Item to push
     * @param compressMessages 是否压缩消息，默认为构造函数中的默认值 / Whether to compress messages, defaults to constructor default
     */
    async pushToQueue(id: string, item: EventMessage, compressMessages?: boolean): Promise<void> {
        const queue = this.getQueue(id);
        await queue.push(item);
    }

    /**
     * 获取指定 id 队列中的所有数据
     * Get all data from queue with specified id
     * @param id 队列 ID / Queue ID
     * @returns 队列中的所有数据 / All data in the queue
     */
    async getQueueData(id: string): Promise<EventMessage[]> {
        const queue = this.queues.get(id);
        if (!queue) {
            throw new Error(`Queue with id '${id}' does not exist`);
        }
        return await queue.getAll();
    }

    /**
     * 清空指定 id 的队列
     * Clear queue with specified id
     * @param id 队列 ID / Queue ID
     */
    clearQueue(id: string): void {
        const queue = this.queues.get(id);
        if (queue) {
            queue.clear();
        }
    }

    /**
     * 删除指定 id 的队列
     * Remove queue with specified id
     * @param id 队列 ID / Queue ID
     * @returns 是否成功删除 / Whether successfully deleted
     */
    removeQueue(id: string) {
        setTimeout(() => {
            return this.queues.delete(id);
        }, 500);
    }

    /**
     * 获取所有队列的 ID
     * Get all queue IDs
     * @returns 所有队列 ID 的数组 / Array of all queue IDs
     */
    getAllQueueIds(): string[] {
        return Array.from(this.queues.keys());
    }

    /**
     * 获取所有队列及其数据的快照
     * Get snapshot of all queues and their data
     * @returns 包含所有队列数据的结果对象 / Result object containing all queue data
     */
    async getAllQueuesData(): Promise<Record<string, EventMessage[]>> {
        const result: Record<string, EventMessage[]> = {};
        for (const [id, queue] of this.queues) {
            result[id] = await queue.getAll();
        }
        return result;
    }

    /**
     * 清空所有队列
     * Clear all queues
     */
    clearAllQueues(): void {
        for (const queue of this.queues.values()) {
            queue.clear();
        }
    }
}
