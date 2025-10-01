import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { client } from './endpoint';
import { ThreadIdParamSchema, ThreadCreatePayloadSchema, ThreadSearchPayloadSchema } from '../zod';

const api = new Hono();

// Threads Routes
api.post('/threads', zValidator('json', ThreadCreatePayloadSchema), async (c) => {
    const payload = c.req.valid('json');
    const thread = await client.threads.create(payload);

    return c.json(thread);
});

api.post('/threads/search', zValidator('json', ThreadSearchPayloadSchema), async (c) => {
    // Search Threads
    const payload = c.req.valid('json');
    const result = await client.threads.search(payload as any);
    c.res.headers.set('X-Pagination-Total', result.length.toString());
    return c.json(result);
});

api.get('/threads/:thread_id', zValidator('param', ThreadIdParamSchema), async (c) => {
    // Get Thread
    const { thread_id } = c.req.valid('param');
    return c.json(await client.threads.get(thread_id));
});

api.delete('/threads/:thread_id', zValidator('param', ThreadIdParamSchema), async (c) => {
    // Delete Thread
    const { thread_id } = c.req.valid('param');
    await client.threads.delete(thread_id);
    return new Response(null, { status: 204 });
});

export default api;
