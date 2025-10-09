# Pure Graph

Pure Graph is a library that provides a standard LangGraph endpoint for integrating into various frameworks like NextJS and Hono.js. It supports multiple storage backends (SQLite, PostgreSQL, Redis) and message queues. This document will guide you on how to use Pure Graph in your projects.

## Features

-   **Multiple Storage Backends**: Support for SQLite, PostgreSQL, Redis, and in-memory storage
-   **Message Queue**: Redis-based stream queue with TTL support
-   **Thread Management**: Comprehensive thread lifecycle management with status tracking
-   **Framework Integration**: Native support for Next.js and Hono.js frameworks

## Installation

First, you need to install the Pure Graph package. You can do this using npm or yarn.

```sh
npm install @langgraph-js/pure-graph
```

or

```sh
yarn add @langgraph-js/pure-graph
```

## Usage

### Next.js Example

```text
my-nextjs-app/
├── app/
│   ├── api/
│   │   └── langgraph/
│   │       └── [...path]/
│   │           └── route.ts      # LangGraph API endpoint
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Your page
├── agent/
│   └── graph-name/
│       ├── graph.ts              # Main graph implementation
│       ├── state.ts              # Graph state definitions
│       └── prompt.ts             # Prompt templates
├── .env.local                    # Environment variables
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

To integrate Pure Graph into a Next.js project, follow these steps:

1. **Create a Route Handler**

    Create a new file `route.ts` inside the `app/api/langgraph/[...path]` directory.

    ```js
    // app/api/langgraph/[...path]/route.ts
    import { NextRequest } from 'next/server';
    import { ensureInitialized } from '@langgraph-js/pure-graph/dist/adapter/nextjs/index';
    export const dynamic = 'force-dynamic';
    export const revalidate = 0;

    const registerGraph = async () => {
        // You must separate graph registration and the router file to avoid Next.js loading the graph multiple times.
        // 必须分开写注册图和 router 文件，以避免 nextjs 多次加载的问题
        await import('@/agent/index');
    };

    export const GET = async (req: NextRequest, context: any) => {
        const { GET } = await ensureInitialized(registerGraph);
        return GET(req);
    };

    export const POST = async (req: NextRequest, context: any) => {
        const { POST } = await ensureInitialized(registerGraph);
        return POST(req);
    };

    export const DELETE = async (req: NextRequest, context: any) => {
        const { DELETE } = await ensureInitialized(registerGraph);
        return DELETE(req);
    };
    ```

    ```ts
    // @/agent/index.ts
    import { registerGraph } from '@langgraph-js/pure-graph';
    import graph from 'you-langgraph-graph';
    registerGraph('test', graph);
    export {};
    ```

2. **Configure Environment Variables**

    Add the necessary environment variables to your `.env` file.

    ```sh
    SQLITE_DATABASE_URI=./.langgraph_api/chat.db
    CHECKPOINT_TYPE=postgres # or redis, shallow/redis
    REDIS_URL="" # Required if using Redis
    ```

### Hono.js Example

To integrate Pure Graph into a Hono.js project, follow these steps:

1. **Create a Hono Application**

    Create a new file `app.js` in your project root.

    ```js
    // app.js
    import { registerGraph } from '@langgraph-js/pure-graph';
    import { graph } from './agent/graph-name/graph';
    import { Hono } from 'hono';
    import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';

    registerGraph('test', graph);

    const app = new Hono<{ Variables: LangGraphServerContext }>();

    app.route('/', LangGraphApp);

    export default app;
    ```

2. **Using LangGraph Entrypoint (Recommended)**

    For more advanced use cases, you can use LangGraph's `entrypoint` function to create reusable workflows:

    ```ts
    // agent/entrypoint-graph.ts
    import { Annotation, entrypoint, getConfig } from '@langchain/langgraph';
    import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
    import { createState } from '@langgraph-js/pro';
    import { createEntrypointGraph } from '@langgraph-js/pure-graph';
    import { ChatOpenAI } from '@langchain/openai';

    const State = createState(createReactAgentAnnotation()).build({});

    const workflow = entrypoint('my-entrypoint', async (state: typeof State.State) => {
        // Access context set by middleware
        const config = getConfig();
        console.log('User ID from context:', config.configurable?.userId);

        const agent = createReactAgent({
            llm: new ChatOpenAI({
                model: 'your-model',
            }),
            prompt: 'You are a helpful assistant',
            tools: [], // Add your tools here
        });

        return agent.invoke(state);
    });

    export const graph = createEntrypointGraph({
        stateSchema: State,
        graph: workflow,
    });
    ```

    ```ts
    // app.ts
    import { registerGraph } from '@langgraph-js/pure-graph';
    import { graph as entrypointGraph } from './agent/entrypoint-graph';
    import { Hono } from 'hono';
    import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';

    // Register your entrypoint graph
    registerGraph('my-entrypoint', entrypointGraph);

    const app = new Hono<{ Variables: LangGraphServerContext }>();

    app.route('/', LangGraphApp);

    export default app;
    ```

3. **Configure Environment Variables**

    Add the necessary environment variables to your `.env` file.

    ```sh
    SQLITE_DATABASE_URI=./.langgraph_api/chat.db
    CHECKPOINT_TYPE=postgres # or redis, shallow/redis
    REDIS_URL="" # Required if using Redis
    ```

## Context Passing

Pure Graph supports passing custom context data to your graphs, which can be accessed via `getConfig().configurable` in your graph logic. This allows you to inject user-specific data, session information, or any other custom data into your LangGraph workflows.

### Graph Code Example

Here's how to access context in your graph logic:

```ts
// agent/context-aware-graph.ts
import { Annotation, entrypoint, getConfig } from '@langchain/langgraph';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { ChatOpenAI } from '@langchain/openai';

const State = createState(createReactAgentAnnotation()).build({});

const workflow = entrypoint('context-aware-graph', async (state: typeof State.State) => {
    // Access context data passed from middleware
    const config = getConfig();

    // Context is available in config.configurable
    const userId = config.configurable?.userId;
    const sessionId = config.configurable?.sessionId;
    const preferences = config.configurable?.preferences;

    console.log('Context received:', {
        userId,
        sessionId,
        preferences,
    });

    // Use context data in your graph logic
    const systemMessage = `You are a helpful assistant for user ${userId || 'anonymous'}.
    User preferences: ${JSON.stringify(preferences || {})}`;

    const agent = createReactAgent({
        llm: new ChatOpenAI({
            model: 'your-model',
        }),
        prompt: systemMessage,
        tools: [], // Add your tools here
    });

    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
```

### Hono.js Implementation

In Hono.js, you can inject context using middleware:

```ts
// app.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph as contextAwareGraph } from './agent/context-aware-graph';
import { Hono } from 'hono';
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';

// Register your context-aware graph
registerGraph('context-aware', contextAwareGraph);

const app = new Hono<{ Variables: LangGraphServerContext }>();

// Middleware to inject custom context
app.use('/api/langgraph/*', async (c, next) => {
    // You can get context from authentication, request data, etc.
    const userId = c.req.header('x-user-id') || 'anonymous';
    const sessionId = c.req.header('x-session-id') || 'session-123';

    c.set('langgraph_context', {
        userId,
        sessionId,
        preferences: { theme: 'dark', language: 'zh' },
        metadata: { source: 'hono-app', timestamp: new Date().toISOString() },
        // Add any custom fields your graph needs
    });

    await next();
});

app.route('/api', LangGraphApp);

export default app;
```

### Next.js Implementation

In Next.js, you can inject context using middleware:

```ts
// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    // Add custom context to x-langgraph-context header
    if (request.nextUrl.pathname.startsWith('/api/langgraph/')) {
        // You can get context from cookies, headers, or other sources
        const userId = request.cookies.get('user-id')?.value || 'anonymous';
        const sessionId = request.cookies.get('session-id')?.value || 'session-123';

        const langgraphContext = {
            userId,
            sessionId,
            preferences: { theme: 'dark', language: 'zh' },
            metadata: { source: 'nextjs-app', timestamp: new Date().toISOString() },
            // Add any custom fields your graph needs
        };

        requestHeaders.set('x-langgraph-context', JSON.stringify(langgraphContext));
    }

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    return response;
}

export const config = {
    matcher: '/api/langgraph/:path*',
};
```

```ts
// app/api/langgraph/[...path]/route.ts
import { GET, POST, DELETE } from '@langgraph-js/pure-graph/dist/adapter/nextjs/router';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph as contextAwareGraph } from '@/agent/context-aware-graph';

// Register your context-aware graph
registerGraph('context-aware', contextAwareGraph);

export { GET, POST, DELETE };
```

## Environment Configuration

Here are the environment variables you need to configure:

-   `SQLITE_DATABASE_URI`: Path to your SQLite database (e.g., `./.langgraph_api/chat.db`).
-   `DATABASE_URL`: PostgreSQL connection string (required for PostgreSQL checkpoint storage).
-   `DATABASE_INIT`: Set to `true` for initial PostgreSQL database setup (required only on first run with PostgreSQL).
-   `CHECKPOINT_TYPE`: Type of checkpoint storage (optional, defaults to memory; options: `postgres`, `redis`, `shallow/redis`).
-   `REDIS_URL`: URL for Redis (required if using Redis checkpoint or message queue).

## Persistence Configuration

Pure Graph supports multiple storage backends for persisting graph state, checkpoints, and thread data. Choose the appropriate storage type based on your requirements for scalability, persistence, and performance.

### Memory Storage (Default)

**Best for**: Development, testing, or stateless applications.

**Configuration**:

```bash
# No additional configuration required - this is the default
```

**Characteristics**:

-   Fastest performance
-   No persistence across restarts
-   Data is lost when the application stops
-   Suitable for development and testing

### SQLite Storage

**Best for**: Single-server applications, development, or small-scale production.

**Configuration**:

```bash
SQLITE_DATABASE_URI=./.langgraph_api/chat.db
```

**Setup**:

```bash
# Create the database directory
mkdir -p .langgraph_api

# The database file will be created automatically on first run
```

**Characteristics**:

-   File-based database
-   Good performance for moderate workloads
-   ACID compliant
-   Single-writer limitation

### PostgreSQL Storage

**Best for**: Production applications requiring high reliability and scalability.

**Configuration**:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/langgraph_db
DATABASE_INIT=true  # Only needed for initial setup
CHECKPOINT_TYPE=postgres
```

**Setup**:

```bash
# First run with DATABASE_INIT=true to create tables
export DATABASE_INIT=true
# Run your application once to initialize the database

# Remove DATABASE_INIT for subsequent runs
unset DATABASE_INIT
```

**Characteristics**:

-   Full ACID compliance
-   Concurrent access support
-   Scalable for high-throughput applications
-   Requires PostgreSQL server setup

### Redis Storage

Pure Graph supports two Redis checkpoint modes:

#### Full Redis Checkpoint

**Best for**: High-performance caching with full persistence.

**Configuration**:

```bash
REDIS_URL=redis://localhost:6379
CHECKPOINT_TYPE=redis
```

#### Shallow Redis Checkpoint

**Best for**: Memory-efficient Redis usage with lighter persistence.

**Configuration**:

```bash
REDIS_URL=redis://localhost:6379
CHECKPOINT_TYPE=shallow/redis
```

**Characteristics**:

-   High performance
-   TTL-based automatic cleanup
-   Distributed caching capabilities
-   Requires Redis server setup

### Redis Message Queue

When using Redis, message queues are automatically enabled for better performance:

**Configuration**:

```bash
REDIS_URL=redis://localhost:6379
# Message queues will use Redis automatically when REDIS_URL is set
```

**Characteristics**:

-   Automatic TTL management (300 seconds)
-   Improved streaming performance
-   Better resource utilization

### Configuration Priority

Storage backends are selected in this priority order:

1. **Redis** (if `REDIS_URL` set and `CHECKPOINT_TYPE` matches)
2. **PostgreSQL** (if `DATABASE_URL` set)
3. **SQLite** (if `SQLITE_DATABASE_URI` set)
4. **Memory** (fallback default)

## API Endpoints

### Assistants

-   **GET /assistants**: Search for assistants.
-   **GET /assistants/{assistantId}**: Retrieve a specific assistant graph.

### Threads

-   **POST /threads**: Create a new thread.
-   **GET /threads**: Search for threads.
-   **GET /threads/{threadId}**: Retrieve a specific thread.
-   **DELETE /threads/{threadId}**: Delete a specific thread.

### Runs

-   **GET /threads/{threadId}/runs**: List runs in a thread.
-   **POST /threads/{threadId}/runs**: Create a new run.
-   **DELETE /threads/{threadId}/runs/{runId}**: Cancel a specific run.
-   **GET /threads/{threadId}/runs/{runId}/stream**: Stream run data.
