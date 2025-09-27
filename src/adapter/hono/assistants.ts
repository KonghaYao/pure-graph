import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { client } from './endpoint';
import { MetadataSchema } from './zod';
const api = new Hono();

api.post(
    '/assistants/search',
    zValidator(
        'json',
        z.object({
            graph_id: z.string().optional(),
            metadata: MetadataSchema.optional(),
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
