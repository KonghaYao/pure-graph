import { EventMessage } from '../../types.js';
import { BaseStreamQueue } from '../../queue/stream-queue.js';
import { BaseStreamQueueInterface } from '../../queue/stream-queue.js';
/** 内存实现的消息队列，用于存储消息 */
export class MemoryStreamQueue extends BaseStreamQueue implements BaseStreamQueueInterface {
    private data: EventMessage[] = [];
    async push(item: EventMessage): Promise<void> {
        const data = this.compressMessages ? ((await this.encodeData(item)) as unknown as EventMessage) : item;
        this.data.push(data);
        this.emit('dataChange', data);
    }

    onDataChange(listener: (data: EventMessage) => void): () => void {
        this.on('dataChange', async (item) => {
            listener(this.compressMessages ? ((await this.decodeData(item)) as EventMessage) : item);
        });
        return () => this.off('dataChange', listener);
    }

    /**
     * 异步生成器：支持 for await...of 方式消费队列数据
     */
    async *onDataReceive(): AsyncGenerator<EventMessage, void, unknown> {
        const queue: EventMessage[] = [];
        let pendingResolve: (() => void) | null = null;
        let isStreamEnded = false;
        const handleData = async (item: EventMessage) => {
            const data = this.compressMessages ? ((await this.decodeData(item as any)) as EventMessage) : item;
            queue.push(data);

            // 检查是否为流结束或错误信号
            if (
                data.event === '__stream_end__' ||
                data.event === '__stream_error__' ||
                data.event === '__stream_cancel__'
            ) {
                isStreamEnded = true;
                if (data.event === '__stream_cancel__') {
                    this.cancel();
                }
            }

            if (pendingResolve) {
                pendingResolve();
                pendingResolve = null;
            }
        };

        this.on('dataChange', handleData as any);

        try {
            while (!isStreamEnded) {
                if (queue.length > 0) {
                    const item = queue.shift() as EventMessage;
                    yield item;
                } else {
                    await new Promise((resolve) => {
                        pendingResolve = resolve as () => void;
                    });
                }
            }
        } finally {
            this.off('dataChange', handleData as any);
        }
    }

    async getAll(): Promise<EventMessage[]> {
        return this.compressMessages
            ? ((await Promise.all(
                  this.data.map((i) => this.decodeData(i as unknown as string | Uint8Array)),
              )) as unknown as EventMessage[])
            : this.data;
    }

    clear(): void {
        this.data = [];
    }
    public cancelSignal = new AbortController();
    cancel(): void {
        this.cancelSignal.abort();
    }
}
