# Pure Graph

Pure Graph is a project that implements a Standard LangGraph Endpoint to many frameworks like NextJS and NuxtJS.

```js
import { registerGraph } from '../src/createEndpoint';
import { graph } from './graph/index';
import { Hono } from 'hono';
import LangGraphApp from '../src/adapter/hono/index';
registerGraph('test', graph);

const app = new Hono();
app.route('/', LangGraphApp);

export default app;
```
