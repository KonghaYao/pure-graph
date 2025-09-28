import { registerGraph } from '../src/createEndpoint';
import { graph } from './graph/index';
import { Hono } from 'hono';
import LangGraphApp from '../src/adapter/hono/index';
registerGraph('test', graph);

const app = new Hono();
app.route('/', LangGraphApp);

export default app;
