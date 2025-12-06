import { client } from './endpoint';
import { ThreadIdParamSchema, ThreadCreatePayloadSchema, ThreadSearchPayloadSchema } from '../zod';
import camelcaseKeys from 'camelcase-keys';
import { parsePathParams, validate, jsonResponse, errorResponse } from './utils';
import { LangGraphServerContext } from './context';

/**
 * POST /threads
 */
export async function createThread(req: Request, context: LangGraphServerContext): Promise<Response> {
    try {
        const body = await req.json();
        const payload = validate(ThreadCreatePayloadSchema, body);

        const thread = await client.threads.create(camelcaseKeys(payload));

        return jsonResponse(thread);
    } catch (error) {
        return errorResponse(error);
    }
}

/**
 * POST /threads/search
 */
export async function searchThreads(req: Request, context: LangGraphServerContext): Promise<Response> {
    try {
        const body = await req.json();
        const payload = validate(ThreadSearchPayloadSchema, body);

        const result = await client.threads.search(camelcaseKeys(payload));

        return jsonResponse(result, 200, {
            'X-Pagination-Total': result.length.toString(),
        });
    } catch (error) {
        return errorResponse(error);
    }
}

/**
 * GET /threads/:thread_id
 */
export async function getThread(req: Request, context: LangGraphServerContext): Promise<Response> {
    try {
        const params = parsePathParams(req.url, '/threads/:thread_id');
        const { thread_id } = validate(ThreadIdParamSchema, params);

        const thread = await client.threads.get(thread_id);

        return jsonResponse(thread);
    } catch (error) {
        return errorResponse(error);
    }
}

/**
 * DELETE /threads/:thread_id
 */
export async function deleteThread(req: Request, context: LangGraphServerContext): Promise<Response> {
    try {
        const params = parsePathParams(req.url, '/threads/:thread_id');
        const { thread_id } = validate(ThreadIdParamSchema, params);

        await client.threads.delete(thread_id);

        return new Response(null, { status: 204 });
    } catch (error) {
        return errorResponse(error);
    }
}
