/** @ts-ignore */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { client } from './endpoint';
import { AssistantConfig, CommandSchema, MetadataSchema } from './zod';
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
            const xray = xrayParam !== null ? xrayParam === 'true' : undefined;
            const data = await client.assistants.getGraph(assistant_id, {
                xray,
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
            const status = url.searchParams.get('status') as any;
            const runs = await client.runs.list(thread_id, {
                limit: limit ? Number(limit) : undefined,
                offset: offset ? Number(offset) : undefined,
                status: status ?? undefined,
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
        const schema = z.object({
            graph_id: z.string().optional(),
            metadata: MetadataSchema.optional(),
            limit: z.number().int().optional(),
            offset: z.number().int().optional(),
        });
        const payload = schema.parse(body);
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
        const schema = z
            .object({
                thread_id: z.string().uuid().optional(),
                metadata: MetadataSchema.optional(),
                if_exists: z.union([z.literal('raise'), z.literal('do_nothing')]).optional(),
            })
            .describe('Payload for creating a thread.');
        const payload = schema.parse(body);
        const thread = await client.threads.create({
            thread_id: payload.thread_id,
            metadata: payload.metadata as any,
            if_exists: (payload.if_exists as any) ?? undefined,
        });
        return NextResponse.json(thread);
    }

    if (pathname.endsWith('/threads/search')) {
        const body = await req.json();
        const schema = z
            .object({
                metadata: z.record(z.unknown()).optional(),
                status: z.enum(['idle', 'busy', 'interrupted', 'error']).optional(),
                values: z.record(z.unknown()).optional(),
                limit: z.number().int().gte(1).lte(1000).optional(),
                offset: z.number().int().gte(0).optional(),
                sort_by: z.enum(['thread_id', 'status', 'created_at', 'updated_at']).optional(),
                sort_order: z.enum(['asc', 'desc']).optional(),
            })
            .describe('Payload for listing threads.');
        const payload = schema.parse(body);
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
            const schema = z
                .object({
                    assistant_id: z.union([z.string().uuid(), z.string()]),
                    checkpoint_id: z.string().optional(),
                    input: z.any().optional(),
                    command: CommandSchema.optional(),
                    metadata: MetadataSchema.optional(),
                    config: AssistantConfig.optional(),
                    webhook: z.string().optional(),
                    interrupt_before: z.union([z.literal('*'), z.array(z.string())]).optional(),
                    interrupt_after: z.union([z.literal('*'), z.array(z.string())]).optional(),
                    on_disconnect: z.enum(['cancel', 'continue']).optional().default('continue'),
                    multitask_strategy: z.enum(['reject', 'rollback', 'interrupt', 'enqueue']).optional(),
                    stream_mode: z
                        .array(z.enum(['values', 'messages', 'messages-tuple', 'updates', 'events', 'debug', 'custom']))
                        .optional(),
                    stream_subgraphs: z.boolean().optional(),
                    stream_resumable: z.boolean().optional(),
                    after_seconds: z.number().optional(),
                    if_not_exists: z.enum(['create', 'reject']).optional(),
                    on_completion: z.enum(['complete', 'continue']).optional(),
                    feedback_keys: z.array(z.string()).optional(),
                    langsmith_tracer: z.unknown().optional(),
                })
                .describe('Payload for creating a stateful run.');
            const payload = schema.parse(body);
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
            const wait = (url.searchParams.get('wait') ?? 'false') === 'true';
            const action = (url.searchParams.get('action') as any) ?? 'interrupt';
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
