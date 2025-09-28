import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { client } from './endpoint';
import { AssistantConfig, CommandSchema, MetadataSchema } from './zod';
import { serialiseAsDict } from '../../graph/stream';

const api = new Hono();

// 最常用的对话接口
api.post(
    '/threads/:thread_id/runs/stream',
    zValidator('param', z.object({ thread_id: z.string().uuid() })),
    zValidator(
        'json',
        z
            .object({
                assistant_id: z.union([z.string().uuid(), z.string()]),
                checkpoint_id: z.string().optional(),
                // checkpoint: CheckpointSchema.optional(),
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
            .describe('Payload for creating a stateful run.'),
    ),
    async (c) => {
        // Stream Run
        const { thread_id } = c.req.valid('param');
        const payload = c.req.valid('json');

        // c.header('Content-Location', `/threads/${thread_id}/runs/${run.run_id}`);
        return streamSSE(c, async (stream) => {
            /** @ts-ignore zod v3 的问题，与 ts 类型不一致 */
            for await (const { event, data } of client.runs.stream(thread_id, payload.assistant_id, payload)) {
                await stream.writeSSE({ data: serialiseAsDict(data), event });
            }
        });
    },
);

api.get(
    '/threads/:thread_id/runs',
    zValidator('param', z.object({ thread_id: z.string().uuid() })),
    zValidator(
        'query',
        z.object({
            limit: z.string().optional(),
            offset: z.string().optional(),
            status: z.enum(['pending', 'running', 'error', 'success', 'timeout', 'interrupted']).optional(),
        }),
    ),
    async (c) => {
        const { thread_id } = c.req.valid('param');
        const { limit, offset, status } = c.req.valid('query');
        const runs = await client.runs.list(thread_id, { limit: Number(limit), offset: Number(offset), status });
        return c.json(runs);
    },
);

api.post(
    '/threads/:thread_id/runs/:run_id/cancel',
    zValidator('param', z.object({ thread_id: z.string().uuid(), run_id: z.string().uuid() })),
    zValidator(
        'query',
        z.object({
            wait: z.coerce.boolean().optional().default(false),
            action: z.enum(['interrupt', 'rollback']).optional().default('interrupt'),
        }),
    ),
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

export default api;
