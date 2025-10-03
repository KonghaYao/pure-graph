# Pure Graph

Pure Graph is a project that implements a Standard LangGraph Endpoint to many frameworks like NextJS and NuxtJS.

You don't need to worry about various issues such as distributed deployment, streaming responses, multi-turn conversations, or tool message integration.

## Next.js Example

```js
// app/api/langgraph/[...path]/route.ts
import { GET, POST, DELETE } from '@langgraph-js/pure-graph/dist/adapter/nextjs/router.js';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from '../../../../../../test/graph/index';
registerGraph('test', graph);

export { GET, POST, DELETE };
```

## Hono.js Example

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
