import { registerGraph } from '../src/createEndpoint';
import { graph } from '/Users/konghayao/code/ai/code-graph/agents/code/graph';
import { Hono } from 'hono';
import LangGraphApp from '../src/adapter/hono/index';
registerGraph('code', graph);

const app = new Hono();
app.route('/', LangGraphApp);

export default app;
