import { registerGraph } from '../src/createEndpoint';
import { graph } from './graph/index';
import { graph as agentGraph } from '../packages/agent-graph/src/index';
import { Hono } from 'hono';
import LangGraphApp from '../src/adapter/hono/index';
registerGraph('test', graph);
registerGraph('agent-graph', agentGraph as unknown as any);

const app = new Hono();
app.route('/', LangGraphApp);

export default app;
