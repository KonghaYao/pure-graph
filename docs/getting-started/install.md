---
title: Installation
---

# Install Open LangGraph Server

Open LangGraph Server is a library that integrates seamlessly into your existing JavaScript projects. Choose the installation method that best fits your workflow.

## Before you start

-   You'll need Node.js 18 or later
-   Have a LangGraph.js graph implementation ready

## Install with pnpm

Add Open LangGraph Server to your JavaScript or TypeScript project:

```bash
pnpm add @langgraph-js/pure-graph
```

### Required peer dependencies

You'll also need to install LangGraph.js core dependencies:

```bash
# Core LangGraph dependencies
pnpm add @langchain/core @langchain/langgraph @langchain/langgraph-checkpoint

# For Hono.js projects
pnpm add hono
```

## Quick setup example

### Hono.js setup

1. **Create your project structure:**

```
my-hono-app/
├── src/
│   ├── agent/
│   │   └── graph.ts
│   ├── routes/
│   │   └── auth.ts
│   └── app.ts
├── .env
└── package.json
```

2. **Install dependencies:**

```bash
pnpm add @langgraph-js/pure-graph @langchain/core @langchain/langgraph hono
```

3. **Create your Hono app:**

```typescript
// src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';
import { registerGraph } from './agent/index';

const app = new Hono<{ Variables: LangGraphServerContext }>();

app.use(cors());

// Register your graph
registerGraph('my-graph', graph);

app.route('/api/langgraph', LangGraphApp);

export default app;
```

## Environment configuration

Create a `.env` file in your project root with your API keys:

```bash
SQLITE_DATABASE_URI=./.langgraph_api/langgraph.db
```

## Start your server

```bash
bun run --port 8123 src/app.ts
# or use deno
deno serve -A --env-file=.env --unstable-sloppy-imports --unstable-bare-node-builtins --port 8123 ./agent/raw-server.ts
```

Your Hono.js server with LangGraph integration is now running!

### Test with Studio

Use [Studio](./studio.md) for interactive testing and debugging:

```bash
npx @langgraph-js/ui
```
