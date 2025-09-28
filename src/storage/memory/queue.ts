import { CancelEventMessage, EventMessage } from '../../queue/event_message.js';
import { BaseStreamQueue } from '../../queue/stream_queue.js';
import { BaseStreamQueueInterface } from '../../queue/stream_queue.js';
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
        let queue: EventMessage[] = [];
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
        // todo 这个框架的事件监听的数据返回顺序有误
        this.on('dataChange', handleData as any);

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
        this.push(new CancelEventMessage());
        this.cancelSignal.abort('user cancel this run');
    }
}
