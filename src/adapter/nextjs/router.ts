/** @ts-ignore */
import { NextRequest, NextResponse } from 'next/server';
import { client } from './endpoint';
import {
    AssistantsSearchSchema,
    AssistantGraphQuerySchema,
    RunStreamPayloadSchema,
    RunListQuerySchema,
    RunCancelQuerySchema,
    RunJoinStreamQuerySchema,
    ThreadCreatePayloadSchema,
    ThreadSearchPayloadSchema,
    ThreadStateUpdate,
} from '../zod';
import { serialiseAsDict } from '../../graph/stream';
import camelcaseKeys from 'camelcase-keys';

// Next.js App Router 的 SSE 响应实现
async function sseResponse(generator: AsyncGenerator<{ event: string; data: unknown }>): Promise<Response> {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const { event, data } of generator) {
                    const line = `event: ${event}\n` + `data: ${serialiseAsDict(data, 0)}\n\n`;
                    controller.enqueue(encoder.encode(line));
                }
            } catch (err) {
                // ignore
            } finally {
                controller.close();
            }
        },
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}

// 统一路由处理器
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Assistants routes
    if (pathname.match(/\/assistants\/[^/]+\/graph$/)) {
        const match = pathname.match(/\/assistants\/([^/]+)\/graph$/);
        if (match) {
            const assistant_id = match[1];
            const xrayParam = url.searchParams.get('xray') ?? undefined;
            const queryParams = { xray: xrayParam };
            const { xray } = AssistantGraphQuerySchema.parse(queryParams);
            const data = await client.assistants.getGraph(assistant_id, {
                xray: xray !== undefined ? xray === 'true' : undefined,
            });
            return NextResponse.json(data);
        }
    }

    // Threads routes
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})$/);
        if (match) {
            const thread_id = match[1];
            const data = await client.threads.get(thread_id);
            return NextResponse.json(data);
        }
    }

    // Runs routes
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/runs$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/runs$/);
        if (match) {
            const thread_id = match[1];
            const limit = url.searchParams.get('limit') ?? undefined;
            const offset = url.searchParams.get('offset') ?? undefined;
            const status = url.searchParams.get('status') ?? undefined;
            const queryParams = { limit, offset, status };
            const {
                limit: parsedLimit,
                offset: parsedOffset,
                status: parsedStatus,
            } = RunListQuerySchema.parse(queryParams);
            const runs = await client.runs.list(thread_id, {
                limit: parsedLimit,
                offset: parsedOffset,
                status: parsedStatus,
            });
            return Response.json(runs);
        }
    }

    // Runs join stream route
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/runs\/[0-9a-fA-F-]{36}\/stream$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/runs\/([0-9a-fA-F-]{36})\/stream$/);
        if (match) {
            const thread_id = match[1];
            const run_id = match[2];

            // 解析查询参数
            const cancel_on_disconnect = url.searchParams.get('cancel_on_disconnect') ?? undefined;
            const last_event_id = url.searchParams.get('last_event_id') ?? undefined;
            const stream_mode = url.searchParams.get('stream_mode') ?? undefined;

            const queryParams = {
                cancel_on_disconnect: cancel_on_disconnect ? cancel_on_disconnect === 'true' : false,
                last_event_id,
                stream_mode,
            };
            const {
                cancel_on_disconnect: parsedCancelOnDisconnect,
                last_event_id: parsedLastEventId,
                stream_mode: parsedStreamMode,
            } = RunJoinStreamQuerySchema.parse(queryParams);

            // 创建 AbortController 用于处理取消信号
            const controller = new AbortController();

            // 如果需要断开连接时取消，则监听请求信号
            if (parsedCancelOnDisconnect && req.signal) {
                req.signal.addEventListener('abort', () => {
                    controller.abort('Client disconnected');
                });
            }

            // 创建带 ID 的生成器
            async function* joinStreamGenerator() {
                try {
                    for await (const { event, data, id } of client.runs.joinStream(thread_id, run_id, {
                        signal: controller.signal,
                        cancelOnDisconnect: parsedCancelOnDisconnect,
                        lastEventId: parsedLastEventId,
                        streamMode: parsedStreamMode ? [parsedStreamMode] : undefined,
                    })) {
                        yield { event: event as unknown as string, data, id };
                    }
                } catch (error) {
                    // 记录错误但不抛出，避免中断流
                    console.error('Join stream error:', error);
                }
            }

            return sseResponse(joinStreamGenerator());
        }
    }

    return new NextResponse('Not Found', { status: 404 });
}

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Assistants routes
    if (pathname.endsWith('/assistants/search')) {
        const body = await req.json();
        const payload = AssistantsSearchSchema.parse(body);
        const data = await client.assistants.search({
            graphId: payload.graph_id,
            metadata: payload.metadata,
            limit: payload.limit,
            offset: payload.offset,
        });
        return NextResponse.json(data, {
            headers: { 'X-Pagination-Total': String(data.length) },
        });
    }

    // Threads routes
    if (pathname.endsWith('/threads')) {
        const body = await req.json();
        const payload = ThreadCreatePayloadSchema.parse(body);
        const thread = await client.threads.create(camelcaseKeys(payload));
        return NextResponse.json(thread);
    }

    if (pathname.endsWith('/threads/search')) {
        const body = await req.json();
        const payload = ThreadSearchPayloadSchema.parse(body);
        const result = await client.threads.search(camelcaseKeys(payload));
        return NextResponse.json(result, {
            headers: { 'X-Pagination-Total': String(result.length) },
        });
    }

    // Threads state update
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/state$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/state$/);
        if (match) {
            const thread_id = match[1];
            const body = await req.json();
            const payload = ThreadStateUpdate.parse(body);
            const result = await client.threads.updateState(thread_id, camelcaseKeys(payload));
            return NextResponse.json(result);
        }
    }

    // Runs routes - stream
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/runs\/stream$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/runs\/stream$/);
        if (match) {
            const thread_id = match[1];
            const body = await req.json();
            const payload = RunStreamPayloadSchema.parse(body);

            // Extract custom context from request headers
            const langgraphContextHeader = req.headers.get('x-langgraph-context');
            if (langgraphContextHeader) {
                const langgraphContext = JSON.parse(decodeURIComponent(langgraphContextHeader));
                payload.config = payload.config || {};
                payload.config.configurable = payload.config.configurable || {};
                Object.assign(payload.config.configurable, langgraphContext);
            }
            const generator = client.runs.stream(
                thread_id,
                payload.assistant_id as string,
                camelcaseKeys(payload) as any,
            );
            return sseResponse(generator as any);
        }
    }

    // Runs routes - cancel
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/runs\/[0-9a-fA-F-]{36}\/cancel$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/runs\/([0-9a-fA-F-]{36})\/cancel$/);
        if (match) {
            const thread_id = match[1];
            const run_id = match[2];
            const waitParam = url.searchParams.get('wait') ?? undefined;
            const actionParam = url.searchParams.get('action') ?? undefined;
            const queryParams = {
                wait: waitParam ? waitParam === 'true' : false,
                action: actionParam ?? 'interrupt',
            };
            const { wait, action } = RunCancelQuerySchema.parse(queryParams);
            const promise = client.runs.cancel(thread_id, run_id, wait, action);
            if (wait) await promise;
            return new Response(null, { status: wait ? 204 : 202 });
        }
    }

    return new NextResponse('Not Found', { status: 404 });
}

export async function DELETE(req: NextRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Threads routes
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})$/);
        if (match) {
            const thread_id = match[1];
            await client.threads.delete(thread_id);
            return new NextResponse(null, { status: 204 });
        }
    }

    return new NextResponse('Not Found', { status: 404 });
}
