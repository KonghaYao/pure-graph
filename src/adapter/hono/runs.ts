import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { streamSSE } from 'hono/streaming';
import { client } from './endpoint';
import {
    ThreadIdParamSchema,
    RunIdParamSchema,
    RunStreamPayloadSchema,
    RunListQuerySchema,
    RunCancelQuerySchema,
} from '../zod';
import { serialiseAsDict } from '../../graph/stream';

const api = new Hono();

// 最常用的对话接口
api.post(
    '/threads/:thread_id/runs/stream',
    zValidator('param', ThreadIdParamSchema),
    zValidator('json', RunStreamPayloadSchema),
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
    zValidator('param', ThreadIdParamSchema),
    zValidator('query', RunListQuerySchema),
    async (c) => {
        const { thread_id } = c.req.valid('param');
        const { limit, offset, status } = c.req.valid('query');
        const runs = await client.runs.list(thread_id, { limit: Number(limit), offset: Number(offset), status });
        return c.json(runs);
    },
);

api.post(
    '/threads/:thread_id/runs/:run_id/cancel',
    zValidator('param', RunIdParamSchema),
    zValidator('query', RunCancelQuerySchema),
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
