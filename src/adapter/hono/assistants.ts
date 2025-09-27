import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { client } from './endpoint';
const api = new Hono();

export const AssistantConfigurable = z
    .object({
        thread_id: z.string().optional(),
        thread_ts: z.string().optional(),
    })
    .catchall(z.unknown());

export const AssistantConfig = z
    .object({
        tags: z.array(z.string()).optional(),
        recursion_limit: z.number().int().optional(),
        configurable: AssistantConfigurable.optional(),
    })
    .catchall(z.unknown())
    .describe('The configuration of an assistant.');

export const Assistant = z.object({
    assistant_id: z.string().uuid(),
    graph_id: z.string(),
    config: AssistantConfig,
    created_at: z.string(),
    updated_at: z.string(),
    metadata: z.object({}).catchall(z.any()),
});

api.post(
    '/assistants/search',
    zValidator(
        'json',
        z.object({
            graph_id: z.string().optional(),
            metadata: z.unknown().optional(),
            limit: z.number().int().optional(),
            offset: z.number().int().optional(),
        }),
    ),
    async (c) => {
        // Search Assistants
        const payload = c.req.valid('json');
        let total = 0;
        const data = await client.assistants.search(payload);
        c.res.headers.set('X-Pagination-Total', total.toString());
        return c.json(data);
    },
);

api.get(
    '/assistants/:assistant_id/graph',
    zValidator('query', z.object({ xray: z.string().optional() })),
    async (c) => {
        const xray = c.req.valid('query').xray;
        const data = await client.assistants.getGraph(c.req.param('assistant_id'), {
            xray: xray !== undefined ? xray === 'true' : undefined,
        });
        return c.json(data);
    },
);

export default api;
