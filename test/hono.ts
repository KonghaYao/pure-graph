import { registerGraph } from '../src/createEndpoint';
import { graph } from './graph/index';
import { graph as entrypointGraph } from './graph/entrypoint';
// import { graph as agentGraph } from '../packages/agent-graph/src/index';
import { Hono } from 'hono';
import LangGraphApp, { type LangGraphServerContext } from '../src/adapter/hono/index';
import { cors } from 'hono/cors';

registerGraph('test', graph);
// registerGraph('agent-graph', agentGraph);
registerGraph('test-entrypoint', entrypointGraph);

const app = new Hono<{ Variables: LangGraphServerContext }>();

app.use(cors());

// Middleware to set langgraph context from request headers
app.use('*', async (c, next) => {
    c.set('langgraph_context', {
        userId: '3274923743297',
    });

    await next();
});

app.route('/', LangGraphApp);

export default app;
