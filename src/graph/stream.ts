import { BaseMessageChunk, isBaseMessage } from '@langchain/core/messages';
import type { BaseCheckpointSaver, LangGraphRunnableConfig } from '@langchain/langgraph';
import type { Pregel } from '@langchain/langgraph/pregel';
import { getLangGraphCommand } from '../utils/getLangGraphCommand.js';
import type { BaseStreamQueueInterface } from '../queue/stream_queue.js';

import { globalMessageQueue } from '../global.js';
import { Run } from '@langgraph-js/sdk';
import { EventMessage, StreamErrorEventMessage, StreamEndEventMessage } from '../queue/event_message.js';

import { BaseThreadsManager } from '../threads/index.js';
import { StreamInputData } from '../types.js';

export type LangGraphStreamMode = Pregel<any, any>['streamMode'][number];

export async function streamStateWithQueue(
    threads: BaseThreadsManager,
    run: Run,
    queue: BaseStreamQueueInterface,
    payload: StreamInputData,
    options: {
        attempt: number;
        getGraph: (
            graphId: string,
            config: LangGraphRunnableConfig | undefined,
            options?: { checkpointer?: BaseCheckpointSaver | null },
        ) => Promise<Pregel<any, any, any, any, any>>;
        compressMessages?: boolean;
    },
): Promise<void> {
    const kwargs = payload;
    const graphId = kwargs.config?.configurable?.graph_id;

    if (!graphId || typeof graphId !== 'string') {
        throw new Error('Invalid or missing graph_id');
    }

    const graph = await options.getGraph(graphId, payload.config, {
        checkpointer: payload.temporary ? null : undefined,
    });

    const userStreamMode = payload.stream_mode ?? [];

    const libStreamMode: Set<LangGraphStreamMode> = new Set([
        'values',
        ...userStreamMode.filter((mode) => mode !== 'events' && mode !== 'messages-tuple'),
    ]);

    if (userStreamMode.includes('messages-tuple')) {
        libStreamMode.add('messages');
    }

    if (userStreamMode.includes('messages')) {
        libStreamMode.add('values');
    }

    await queue.push(
        new EventMessage('metadata', {
            run_id: run.run_id,
            attempt: options.attempt,
            graph_id: graphId,
        }),
    );

    const metadata = {
        ...payload.config?.metadata,
        run_attempt: options.attempt,
    };
    const events = graph.streamEvents(
        payload.command != null ? getLangGraphCommand(payload.command) : payload.input ?? null,
        {
            version: 'v2' as const,

            interruptAfter: payload.interrupt_after,
            interruptBefore: payload.interrupt_before,

            tags: payload.config?.tags,
            configurable: payload.config?.configurable,
            recursionLimit: payload.config?.recursionLimit,
            subgraphs: payload.stream_subgraphs,
            metadata,

            runId: run.run_id,
            streamMode: [...libStreamMode],
            signal: queue.cancelSignal.signal,
        },
    );

    const messages: Record<string, BaseMessageChunk> = {};
    const completedIds = new Set<string>();

    try {
        for await (const event of events) {
            // console.log(event);
            if (event.tags?.includes('langsmith:hidden')) continue;
            if (event.event === 'on_chain_stream' && event.run_id === run.run_id) {
                const [ns, mode, chunk] = (
                    payload.stream_subgraphs ? event.data.chunk : [null, ...event.data.chunk]
                ) as [string[] | null, LangGraphStreamMode, unknown];

                // Listen for debug events and capture checkpoint
                let data: unknown = chunk;

                if (mode === 'messages') {
                    if (userStreamMode.includes('messages-tuple')) {
                        await queue.push(new EventMessage('messages', data));
                    }
                } else if (userStreamMode.includes(mode)) {
                    if (payload.stream_subgraphs && ns?.length) {
                        await queue.push(new EventMessage(`${mode}|${ns.join('|')}`, data));
                    } else {
                        await queue.push(new EventMessage(mode, data));
                    }
                }
                if (mode === 'values') {
                    await threads.set(run.thread_id, {
                        values: data ? JSON.parse(serialiseAsDict(data)) : '',
                    });
                }
            } else if (userStreamMode.includes('events')) {
                await queue.push(new EventMessage('events', event));
            }

            // TODO: we still rely on old messages mode based of streamMode=values
            // In order to fully switch to library messages mode, we need to do ensure that
            // `StreamMessagesHandler` sends the final message, which requires the following:
            // - handleLLMEnd does not send the final message b/c handleLLMNewToken sets the this.emittedChatModelRunIds[runId] flag. Python does not do that
            // - handleLLMEnd receives the final message as BaseMessageChunk rather than BaseMessage, which from the outside will become indistinguishable.
            // - handleLLMEnd should not dedupe the message
            // - Don't think there's an utility that would convert a BaseMessageChunk to a BaseMessage?
            if (userStreamMode.includes('messages')) {
                if (event.event === 'on_chain_stream' && event.run_id === run.run_id) {
                    const newMessages: Array<BaseMessageChunk> = [];
                    const [_, chunk]: [string, any] = event.data.chunk;

                    let chunkMessages: Array<BaseMessageChunk> = [];
                    if (typeof chunk === 'object' && chunk != null && 'messages' in chunk && !isBaseMessage(chunk)) {
                        chunkMessages = chunk?.messages;
                    }

                    if (!Array.isArray(chunkMessages)) {
                        chunkMessages = [chunkMessages];
                    }

                    for (const message of chunkMessages) {
                        if (!message.id || completedIds.has(message.id)) continue;
                        completedIds.add(message.id);
                        newMessages.push(message);
                    }

                    if (newMessages.length > 0) {
                        await queue.push(new EventMessage('messages/complete', newMessages));
                    }
                } else if (event.event === 'on_chat_model_stream' && !event.tags?.includes('nostream')) {
                    const message: BaseMessageChunk = event.data.chunk;

                    if (!message.id) continue;

                    if (messages[message.id] == null) {
                        messages[message.id] = message;
                        await queue.push(
                            new EventMessage('messages/metadata', {
                                [message.id]: { metadata: event.metadata },
                            }),
                        );
                    } else {
                        messages[message.id] = messages[message.id].concat(message);
                    }

                    await queue.push(new EventMessage('messages/partial', [messages[message.id]]));
                }
            }
        }
    } finally {
        // 发送流结束信号
        await queue.push(new StreamEndEventMessage());
    }
}

/**
 * 从队列创建数据流生成器
 * @param queueId 队列 ID
 * @param signal 中止信号
 * @returns 数据流生成器
 */
export async function* createStreamFromQueue(queueId: string): AsyncGenerator<{ event: string; data: unknown }> {
    const queue = globalMessageQueue.getQueue(queueId);
    return queue.onDataReceive();
}

export const serialiseAsDict = (obj: unknown, indent = 2) => {
    return JSON.stringify(
        obj,
        function (key: string | number, value: unknown) {
            const rawValue = this[key];
            if (
                rawValue != null &&
                typeof rawValue === 'object' &&
                'toDict' in rawValue &&
                typeof rawValue.toDict === 'function'
            ) {
                // TODO: we need to upstream this to LangChainJS
                const { type, data } = rawValue.toDict();
                return { ...data, type };
            }

            return value;
        },
        indent,
    );
};
/**
 * 兼容性函数：保持原有 API，同时使用队列模式
 * @param run 运行配置
 * @param options 选项
 * @returns 数据流生成器
 */
export async function* streamState(
    threads: BaseThreadsManager,
    run: Run | Promise<Run>,
    payload: StreamInputData,
    options: {
        attempt: number;
        getGraph: (
            graphId: string,
            config: LangGraphRunnableConfig | undefined,
            options?: { checkpointer?: BaseCheckpointSaver | null },
        ) => Promise<Pregel<any, any, any, any, any>>;
        compressMessages?: boolean;
    },
) {
    run = await run;
    // 生成唯一的队列 ID
    const queueId = run.run_id;
    const threadId = run.thread_id;
    try {
        // 启动队列推送任务（在后台异步执行）
        await threads.set(threadId, { status: 'busy' });
        await threads.updateRun(run.run_id, { status: 'running' });
        const queue = globalMessageQueue.createQueue(queueId);
        const state = queue.onDataReceive();
        streamStateWithQueue(threads, run, queue, payload, options).catch((error) => {
            console.error('Queue task error:', error);
            // 如果生产者出错，向队列推送错误信号
            globalMessageQueue.pushToQueue(queueId, new StreamErrorEventMessage(error));
            // TODO 不知道这里需不需要错误处理
        });
        for await (const data of state) {
            yield data;
        }
        await threads.updateRun(run.run_id, { status: 'success' });
    } catch (error) {
        // 如果发生错误，确保清理资源
        console.error('Stream error:', error);
        await threads.updateRun(run.run_id, { status: 'error' });
        await threads.set(threadId, { status: 'error' });
        // throw error;
    } finally {
        // 在完成后清理队列
        await threads.set(threadId, { status: 'idle' });
        globalMessageQueue.removeQueue(queueId);
    }
}
