import { client } from './endpoint';
import { AssistantsSearchSchema, AssistantGraphQuerySchema } from '../zod';
import camelcaseKeys from 'camelcase-keys';
import { parseQueryParams, validate, jsonResponse, errorResponse } from './utils';
import { LangGraphServerContext } from './context';

/**
 * POST /assistants/search
 */
export async function searchAssistants(req: Request, context: LangGraphServerContext): Promise<Response> {
    try {
        const body = await req.json();
        const payload = validate(AssistantsSearchSchema, body);

        const data = await client.assistants.search(camelcaseKeys(payload));

        return jsonResponse(data, 200, {
            'X-Pagination-Total': '0',
        });
    } catch (error) {
        return errorResponse(error);
    }
}

/**
 * GET /assistants/:assistant_id/graph
 */
export async function getAssistantGraph(req: Request, context: LangGraphServerContext): Promise<Response> {
    try {
        const url = new URL(req.url);
        const pathParts = url.pathname.split('/').filter((p) => p);
        const assistant_id = pathParts[1]; // assistants/:assistant_id/graph

        const queryParams = parseQueryParams(req.url);
        const { xray } = validate(AssistantGraphQuerySchema, queryParams);

        const data = await client.assistants.getGraph(assistant_id, {
            xray: xray !== undefined ? xray === 'true' : undefined,
        });

        return jsonResponse(data);
    } catch (error) {
        return errorResponse(error);
    }
}
