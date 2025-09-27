import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import { client } from './endpoint';
import { AssistantConfig } from './assistants';
import { serialiseAsDict } from '../../graph/stream';

const api = new Hono();

export const CommandSchema = z.object({
    goto: z
        .union([
            z.union([z.string(), z.object({ node: z.string(), input: z.unknown().optional() })]),
            z.array(z.union([z.string(), z.object({ node: z.string(), input: z.unknown().optional() })])),
        ])
        .optional(),
    update: z.union([z.record(z.unknown()), z.array(z.tuple([z.string(), z.unknown()]))]).optional(),
    resume: z.unknown().optional(),
});

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
                input: z.union([z.unknown(), z.null()]).optional(),
                command: CommandSchema.optional(),
                metadata: z.object({}).catchall(z.any()).describe('Metadata for the run.').optional(),
                config: AssistantConfig.optional(),
                webhook: z.string().optional(),
                interrupt_before: z.union([z.enum(['*']), z.array(z.string())]).optional(),
                interrupt_after: z.union([z.enum(['*']), z.array(z.string())]).optional(),
                on_disconnect: z.enum(['cancel', 'continue']).optional().default('continue'),
                multitask_strategy: z.enum(['reject', 'rollback', 'interrupt', 'enqueue']).optional(),
                stream_mode: z
                    .union([
                        z.array(
                            z.enum(['values', 'messages', 'messages-tuple', 'updates', 'events', 'debug', 'custom']),
                        ),
                        z.enum(['values', 'messages', 'messages-tuple', 'updates', 'events', 'debug', 'custom']),
                    ])
                    .optional(),
                stream_subgraphs: z.boolean().optional(),
                stream_resumable: z.boolean().optional(),
                after_seconds: z.number().optional(),
                if_not_exists: z.enum(['reject', 'create']).optional(),
                on_completion: z.enum(['delete', 'keep']).optional(),
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
            for await (const { event, data } of client.runs.stream(thread_id, payload.assistant_id, payload)) {
                await stream.writeSSE({ data: serialiseAsDict(data), event });
            }
            await stream.sleep(500); // 不知为何要等
        });
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
        await client.runs.cancel(thread_id, run_id, wait, action);
        return c.body(null, wait ? 204 : 202);
    },
);

export default api;
