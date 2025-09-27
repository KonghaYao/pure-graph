import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { client } from './endpoint';

const api = new Hono();

// Threads Routes
api.post(
    '/threads',
    zValidator(
        'json',
        z
            .object({
                supersteps: z
                    .array(
                        z.object({
                            updates: z.array(
                                z.object({
                                    values: z.unknown().nullish(),
                                    command: z.unknown().nullish(),
                                    as_node: z.string(),
                                }),
                            ),
                        }),
                    )
                    .describe('The supersteps to apply to the thread.')
                    .optional(),
                thread_id: z
                    .string()
                    .uuid()
                    .describe('The ID of the thread. If not provided, an ID is generated.')
                    .optional(),
                metadata: z.object({}).catchall(z.any()).describe('Metadata for the thread.').optional(),
                if_exists: z.union([z.literal('raise'), z.literal('do_nothing')]).optional(),
            })
            .describe('Payload for creating a thread.'),
    ),
    async (c) => {
        const payload = c.req.valid('json');
        const thread = await client.threads.create(payload);

        return c.json(thread);
    },
);

api.post(
    '/threads/search',
    zValidator(
        'json',
        z
            .object({
                metadata: z.record(z.unknown()).describe('Metadata to search for.').optional(),
                status: z
                    .enum(['idle', 'busy', 'interrupted', 'error'])
                    .describe('Filter by thread status.')
                    .optional(),
                values: z.record(z.unknown()).describe('Filter by thread values.').optional(),
                limit: z.number().int().gte(1).lte(1000).describe('Maximum number to return.').optional(),
                offset: z.number().int().gte(0).describe('Offset to start from.').optional(),
                sort_by: z
                    .enum(['thread_id', 'status', 'created_at', 'updated_at'])
                    .describe('Sort by field.')
                    .optional(),
                sort_order: z.enum(['asc', 'desc']).describe('Sort order.').optional(),
            })
            .describe('Payload for listing threads.'),
    ),
    async (c) => {
        // Search Threads
        const payload = c.req.valid('json');
        const result = await client.threads.search(payload as any);
        c.res.headers.set('X-Pagination-Total', result.length.toString());
        return c.json(result);
    },
);

api.get('/threads/:thread_id', zValidator('param', z.object({ thread_id: z.string().uuid() })), async (c) => {
    // Get Thread
    const { thread_id } = c.req.valid('param');
    return c.json(await client.threads.get(thread_id));
});

api.delete('/threads/:thread_id', zValidator('param', z.object({ thread_id: z.string().uuid() })), async (c) => {
    // Delete Thread
    const { thread_id } = c.req.valid('param');
    await client.threads.delete(thread_id);
    return new Response(null, { status: 204 });
});

export default api;
