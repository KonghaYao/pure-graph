import { Hono } from 'hono';
import Assistants from './assistants';
import Runs from './runs';
import Threads from './threads';
import { cors } from 'hono/cors';
const app = new Hono();

app.use(cors());

app.route('/', Assistants);
app.route('/', Runs);
app.route('/', Threads);

export default app;
