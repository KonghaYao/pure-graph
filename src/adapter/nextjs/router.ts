/** @ts-ignore */
import { NextRequest } from 'next/server';
import { handleRequest } from '../fetch';

/**
 * 从 NextRequest 提取 langgraph context
 */
function extractContext(req: NextRequest) {
    const langgraphContextHeader = req.headers.get('x-langgraph-context');
    if (langgraphContextHeader) {
        try {
            return {
                langgraph_context: JSON.parse(decodeURIComponent(langgraphContextHeader)),
            };
        } catch (error) {
            console.error('Failed to parse x-langgraph-context header:', error);
        }
    }
    return {};
}

// 统一路由处理器
export async function GET(req: NextRequest) {
    const context = extractContext(req);
    return await handleRequest(req, context);
}

export async function POST(req: NextRequest) {
    const context = extractContext(req);
    return await handleRequest(req, context);
}

export async function DELETE(req: NextRequest) {
    const context = extractContext(req);
    return await handleRequest(req, context);
}
