import { Hono } from 'hono';
import { handleRequest } from '../fetch';
// import { cors } from 'hono/cors';

export interface LangGraphServerContext {
    langgraph_context: any;
}

const app = new Hono<{ Variables: LangGraphServerContext }>();

// app.use(cors());

// 使用 fetch 实现的 handleRequest 统一处理所有请求
app.all('*', async (c) => {
    // 从 hono context 中提取 langgraph_context
    const context = {
        langgraph_context: c.get('langgraph_context'),
    };

    // 调用标准的 fetch handleRequest
    const response = await handleRequest(c.req.raw, context);

    return response;
});

export default app;
