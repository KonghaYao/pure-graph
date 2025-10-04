# Pure Graph

Pure Graph is a library that provides a standard LangGraph endpoint for integrating into various frameworks like NextJS and Hono.js. This document will guide you on how to use Pure Graph in your projects.

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

To integrate Pure Graph into a Next.js project, follow these steps:

1. **Create a Route Handler**

    Create a new file `route.ts` inside the `app/api/langgraph/[...path]` directory.

    ```js
    // app/api/langgraph/[...path]/route.ts
    import { GET, POST, DELETE } from '@langgraph-js/pure-graph/dist/adapter/nextjs/router.js';
    import { registerGraph } from '@langgraph-js/pure-graph';
    import { graph } from './path/to/your/graph'; // Replace with your graph implementation

    registerGraph('test', graph);

    export { GET, POST, DELETE };
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
    import { graph } from './path/to/your/graph'; // Replace with your graph implementation
    import { Hono } from 'hono';
    import LangGraphApp from '@langgraph-js/pure-graph/dist/adapter/hono/index';

    registerGraph('test', graph);

    const app = new Hono();
    app.route('/', LangGraphApp);

    export default app;
    ```

2. **Configure Environment Variables**

    Add the necessary environment variables to your `.env` file.

    ```sh
    SQLITE_DATABASE_URI=./.langgraph_api/chat.db
    CHECKPOINT_TYPE=postgres # or redis, shallow/redis
    REDIS_URL="" # Required if using Redis
    ```

## Environment Configuration

Here are the environment variables you need to configure:

- `SQLITE_DATABASE_URI`: Path to your SQLite database.
- `CHECKPOINT_TYPE`: Type of checkpoint storage (e.g., `postgres`, `redis`, `shallow/redis`).
- `REDIS_URL`: URL for Redis (required if using Redis).

## API Endpoints

### Assistants

- **GET /assistants**: Search for assistants.
- **GET /assistants/{assistantId}**: Retrieve a specific assistant graph.

### Threads

- **POST /threads**: Create a new thread.
- **GET /threads**: Search for threads.
- **GET /threads/{threadId}**: Retrieve a specific thread.
- **DELETE /threads/{threadId}**: Delete a specific thread.

### Runs

- **GET /threads/{threadId}/runs**: List runs in a thread.
- **POST /threads/{threadId}/runs**: Create a new run.
- **DELETE /threads/{threadId}/runs/{runId}**: Cancel a specific run.
- **GET /threads/{threadId}/runs/{runId}/stream**: Stream run data.
