import { Hono } from 'hono';
import Assistants from './assistants';
import Runs from './runs';
import Threads from './threads';
import { cors } from 'hono/cors';

export interface LangGraphServerContext {
    langgraph_context: any;
}
const app = new Hono<{ Variables: LangGraphServerContext }>();

app.use(cors());

app.route('/', Assistants);
app.route('/', Runs);
app.route('/', Threads);

export default app;
