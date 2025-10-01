/** @ts-ignore */
import { NextRequest, NextResponse } from 'next/server';
import { client } from './endpoint';
import {
    AssistantsSearchSchema,
    AssistantGraphQuerySchema,
    RunStreamPayloadSchema,
    RunListQuerySchema,
    RunCancelQuerySchema,
    ThreadCreatePayloadSchema,
    ThreadSearchPayloadSchema,
} from '../zod';
import { serialiseAsDict } from '../../graph/stream';

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
            const xrayParam = url.searchParams.get('xray');
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
            const limit = url.searchParams.get('limit');
            const offset = url.searchParams.get('offset');
            const status = url.searchParams.get('status');
            const queryParams = { limit, offset, status };
            const {
                limit: parsedLimit,
                offset: parsedOffset,
                status: parsedStatus,
            } = RunListQuerySchema.parse(queryParams);
            const runs = await client.runs.list(thread_id, {
                limit: parsedLimit ? Number(parsedLimit) : undefined,
                offset: parsedOffset ? Number(parsedOffset) : undefined,
                status: parsedStatus ?? undefined,
            });
            return Response.json(runs);
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
            metadata: payload.metadata as any,
            limit: payload.limit,
            offset: payload.offset,
        } as any);
        return NextResponse.json(data, {
            headers: { 'X-Pagination-Total': String(data.length) },
        });
    }

    // Threads routes
    if (pathname.endsWith('/threads')) {
        const body = await req.json();
        const payload = ThreadCreatePayloadSchema.parse(body);
        const thread = await client.threads.create({
            thread_id: payload.thread_id,
            metadata: payload.metadata as any,
            if_exists: (payload.if_exists as any) ?? undefined,
        });
        return NextResponse.json(thread);
    }

    if (pathname.endsWith('/threads/search')) {
        const body = await req.json();
        const payload = ThreadSearchPayloadSchema.parse(body);
        const result = await client.threads.search({
            metadata: payload.metadata as any,
            status: payload.status as any,
            limit: payload.limit,
            offset: payload.offset,
            sortBy: (payload.sort_by as any) ?? undefined,
            sortOrder: (payload.sort_order as any) ?? undefined,
        });
        return NextResponse.json(result, {
            headers: { 'X-Pagination-Total': String(result.length) },
        });
    }

    // Runs routes - stream
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/runs\/stream$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/runs\/stream$/);
        if (match) {
            const thread_id = match[1];
            const body = await req.json();
            const payload = RunStreamPayloadSchema.parse(body);
            const generator = client.runs.stream(thread_id, payload.assistant_id as string, payload as any);
            return sseResponse(generator as any);
        }
    }

    // Runs routes - cancel
    if (pathname.match(/\/threads\/[0-9a-fA-F-]{36}\/runs\/[0-9a-fA-F-]{36}\/cancel$/)) {
        const match = pathname.match(/\/threads\/([0-9a-fA-F-]{36})\/runs\/([0-9a-fA-F-]{36})\/cancel$/);
        if (match) {
            const thread_id = match[1];
            const run_id = match[2];
            const waitParam = url.searchParams.get('wait');
            const actionParam = url.searchParams.get('action');
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
