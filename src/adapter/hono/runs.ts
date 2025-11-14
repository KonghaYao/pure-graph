import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { SSEStreamingApi, streamSSE } from 'hono/streaming';
import { client } from './endpoint';
import {
    ThreadIdParamSchema,
    RunIdParamSchema,
    RunStreamPayloadSchema,
    RunListQuerySchema,
    RunCancelQuerySchema,
    RunJoinStreamQuerySchema,
    ThreadStateUpdate,
} from '../zod';
import { serialiseAsDict } from '../../graph/stream';
import z from 'zod';
import type { LangGraphServerContext } from './index';
import camelcaseKeys from 'camelcase-keys';

/**
 * 为 streamSSE 添加心跳功能的 wrapper 函数
 * @param streamFn 原始的 async stream 函数
 * @param heartbeatInterval 心跳间隔，默认 3 秒
 * @returns 包裹后的 async stream 函数
 */
function withHeartbeat(
    streamFn: (stream: SSEStreamingApi) => Promise<void>,
    heartbeatInterval: number = 3000,
): (stream: SSEStreamingApi) => Promise<void> {
    return async (stream: SSEStreamingApi) => {
        let heartbeatTimer: NodeJS.Timeout | null = null;

        // 启动心跳定时器的函数
        const startHeartbeat = () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
            heartbeatTimer = setInterval(async () => {
                try {
                    await stream.writeSSE({ event: 'ping', data: '{}' });
                } catch (error) {
                    if (heartbeatTimer) {
                        clearInterval(heartbeatTimer);
                        heartbeatTimer = null;
                    }
                }
            }, heartbeatInterval);
        };

        // 停止心跳定时器的函数
        const stopHeartbeat = () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
            }
        };

        // 创建代理 stream 对象，在每次写入时重置心跳
        const proxiedStream = new Proxy(stream, {
            get(target, prop) {
                if (prop === 'writeSSE') {
                    return async (...args: any[]) => {
                        // 每次有数据写入时，先停止当前心跳，然后重新启动
                        stopHeartbeat();
                        const result = await (target as any)[prop](...args);
                        startHeartbeat();
                        return result;
                    };
                }
                return (target as any)[prop];
            },
        });

        // 启动初始心跳
        startHeartbeat();

        try {
            await streamFn(proxiedStream);
        } finally {
            stopHeartbeat();
        }
    };
}

const api = new Hono<{ Variables: LangGraphServerContext }>();

// 最常用的对话接口
api.post(
    '/threads/:thread_id/runs/stream',
    zValidator('param', ThreadIdParamSchema),
    zValidator('json', RunStreamPayloadSchema),
    async (c) => {
        // Stream Run
        const { thread_id } = c.req.valid('param');
        const payload = c.req.valid('json');

        // c.header('Content-Location', `/threads/${thread_id}/runs/${run.run_id}`);
        return streamSSE(
            c,
            withHeartbeat(async (stream) => {
                payload.config = payload.config || {};
                payload.config.configurable = payload.config.configurable || {};
                const langgraphContext = c.get('langgraph_context');
                if (langgraphContext) {
                    Object.assign(payload.config.configurable, langgraphContext);
                }
                /** @ts-ignore zod v3 的问题，与 ts 类型不一致 */
                for await (const { event, data } of client.runs.stream(
                    thread_id,
                    payload.assistant_id,
                    camelcaseKeys(payload) as any,
                )) {
                    await stream.writeSSE({ data: serialiseAsDict(data) ?? '', event });
                }
            }),
        );
    },
);

// 加入现有流的 GET 接口
api.get(
    '/threads/:thread_id/runs/:run_id/stream',
    zValidator('param', RunIdParamSchema),
    zValidator('query', RunJoinStreamQuerySchema),
    async (c) => {
        const { thread_id, run_id } = c.req.valid('param');
        const { cancel_on_disconnect, last_event_id, stream_mode } = c.req.valid('query');

        return streamSSE(
            c,
            withHeartbeat(async (stream) => {
                // 创建 AbortController 用于处理取消信号
                const controller = new AbortController();

                // 如果需要断开连接时取消，则监听连接断开事件
                if (cancel_on_disconnect) {
                    const cleanup = () => {
                        controller.abort('Client disconnected');
                    };

                    // 监听连接断开事件
                    c.req.raw.signal?.addEventListener('abort', cleanup);
                    stream.onAbort = cleanup;
                }

                try {
                    // 使用 joinStream 方法加入现有流
                    for await (const { event, data, id } of client.runs.joinStream(thread_id, run_id, {
                        signal: controller.signal,
                        cancelOnDisconnect: cancel_on_disconnect,
                        lastEventId: last_event_id,
                        streamMode: stream_mode ? [stream_mode] : undefined,
                    })) {
                        // 发送 SSE 事件
                        await stream.writeSSE({
                            data: serialiseAsDict(data) ?? '',
                            event: event as unknown as string,
                            id,
                        });
                    }
                } catch (error) {
                    // 如果不是用户取消导致的错误，则发送错误事件
                    if (!(error instanceof Error) || !error.message.includes('user cancel')) {
                        console.error('Join stream error:', error);
                        await stream.writeSSE({
                            event: 'error',
                            data: JSON.stringify({
                                error: error instanceof Error ? error.message : 'Unknown error',
                            }),
                        });
                    }
                }
            }),
        );
    },
);

api.get(
    '/threads/:thread_id/runs',
    zValidator('param', ThreadIdParamSchema),
    zValidator('query', RunListQuerySchema),
    async (c) => {
        const { thread_id } = c.req.valid('param');
        const { limit, offset, status } = c.req.valid('query');
        const runs = await client.runs.list(thread_id, { limit, offset, status });
        return c.json(runs);
    },
);

api.post(
    '/threads/:thread_id/runs/:run_id/cancel',
    zValidator('param', RunIdParamSchema),
    zValidator('query', RunCancelQuerySchema),
    async (c) => {
        // Cancel Run Http
        const { thread_id, run_id } = c.req.valid('param');
        const { wait, action } = c.req.valid('query');
        const cancel = client.runs.cancel(thread_id, run_id, wait, action);
        if (wait) {
            await cancel;
        }
        return c.body(null, wait ? 204 : 202);
    },
);

api.post(
    '/threads/:thread_id/state',
    zValidator('param', z.object({ thread_id: z.string().uuid() })),
    zValidator('json', ThreadStateUpdate),
    async (c) => {
        // Update Thread State
        const { thread_id } = c.req.valid('param');
        const payload = c.req.valid('json');
        // const config: RunnableConfig = { configurable: { thread_id } };

        // if (payload.checkpoint_id) {
        //     config.configurable ??= {};
        //     config.configurable.checkpoint_id = payload.checkpoint_id;
        // }
        // if (payload.checkpoint) {
        //     config.configurable ??= {};
        //     Object.assign(config.configurable, payload.checkpoint);
        // }

        const inserted = await client.threads.updateState(thread_id, payload);

        return c.json(inserted);
    },
);
export default api;
