import { registerGraph } from '../src/createEndpoint';
import { graph } from './graph/index';
import { graph as entrypointGraph } from './graph/entrypoint';
// import { graph as agentGraph } from '../packages/agent-graph/src/index';
import { Hono } from 'hono';
import LangGraphApp from '../src/adapter/hono/index';

registerGraph('test', graph);
// registerGraph('agent-graph', agentGraph);
registerGraph('test-entrypoint', entrypointGraph);

const app = new Hono();
app.route('/', LangGraphApp);

export default app;
