import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { client } from './endpoint';
import { AssistantsSearchSchema, AssistantGraphQuerySchema } from '../zod';
import camelcaseKeys from 'camelcase-keys';
const api = new Hono();

api.post('/assistants/search', zValidator('json', AssistantsSearchSchema), async (c) => {
    // Search Assistants
    const payload = c.req.valid('json');
    let total = 0;
    const data = await client.assistants.search(camelcaseKeys(payload));
    c.res.headers.set('X-Pagination-Total', total.toString());
    return c.json(data);
});

api.get('/assistants/:assistant_id/graph', zValidator('query', AssistantGraphQuerySchema), async (c) => {
    const xray = c.req.valid('query').xray;
    const data = await client.assistants.getGraph(c.req.param('assistant_id'), {
        xray: xray !== undefined ? xray === 'true' : undefined,
    });
    return c.json(data);
});

export default api;
