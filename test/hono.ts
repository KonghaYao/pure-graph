import { Hono } from 'hono';
import { CompiledGraph } from '@langchain/langgraph';
import { registerGraph } from '../src/index';
import { graph } from './graph/index';
import Assistants from '../src/adapter/hono/assistants';
import Runs from '../src/adapter/hono/runs';
import Threads from '../src/adapter/hono/threads';
import { cors } from 'hono/cors';

registerGraph('test', graph);

const app = new Hono();
app.use(cors());
// 添加子路由
app.route('/', Assistants);
app.route('/', Runs);
app.route('/', Threads);

export default app;
