import { NextRequest } from 'next/server';
import { ensureInitialized } from '@langgraph-js/pure-graph/dist/adapter/nextjs/index';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const registerGraph = async () => {
    // You must separate graph registration and the router file to avoid Next.js loading the graph multiple times.
    // 必须分开写注册图和 router 文件，以避免 nextjs 多次加载的问题
    await import('../../../agent/index');
};

export const GET = async (req: NextRequest, context: any) => {
    const { GET } = await ensureInitialized(registerGraph);
    return GET(req);
};

export const POST = async (req: NextRequest, context: any) => {
    const { POST } = await ensureInitialized(registerGraph);
    return POST(req);
};

export const DELETE = async (req: NextRequest, context: any) => {
    const { DELETE } = await ensureInitialized(registerGraph);
    return DELETE(req);
};
