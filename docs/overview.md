---
title: Overview
---

# Architecture Overview

Pure Graph is built with a modular architecture that separates concerns into distinct layers, allowing for maximum flexibility and extensibility. This document provides an in-depth look at the core components and how they interact.

## Core Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Framework     │    │    Pure Graph    │    │   LangGraph     │
│   Adapters      │◄──►│    API Layer     │◄──►│   Workflows     │
│                 │    │                  │    │                 │
│ • Next.js       │    │ • REST Endpoints │    │ • StateGraphs   │
│ • Hono.js       │    │ • Type Validation│    │ • Agents        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼──────┐ ┌──▼──┐ ┌─────▼─────┐
            │   Storage    │ │Queue│ │   Threads  │
            │   Layer      │ │     │ │   Manager  │
            │              │ │     │ │            │
            │ • SQLite     │ │ •   │ │ • Lifecycle│
            │ • PostgreSQL │ │   Redis │ • Status   │
            │ • Redis      │ │ •   │ │ • Metadata  │
            │ • Memory     │ │ Memory │ │            │
            └──────────────┘ └─────┘ └────────────┘
```

## Component Breakdown

### Framework Adapters

Framework adapters provide the HTTP interface and handle request/response lifecycle. They are responsible for:

-   **Request Routing**: Mapping HTTP requests to Pure Graph operations
-   **Context Injection**: Passing framework-specific context to graph executions
-   **Response Formatting**: Converting LangGraph outputs to appropriate HTTP responses
-   **Middleware Support**: Integrating with framework authentication and middleware systems

#### Next.js Adapter

The Next.js adapter leverages Next.js App Router for optimal performance:

```typescript
// app/api/langgraph/[...path]/route.ts
import { ensureInitialized } from '@langgraph-js/pure-graph/dist/adapter/nextjs/index';

export const GET = async (req: NextRequest, context: any) => {
    const { GET } = await ensureInitialized(registerGraph);
    return GET(req);
};
```

Key features:

-   Lazy initialization to prevent Next.js context isolation issues
-   Automatic middleware integration via `x-langgraph-context` headers
-   Built-in support for dynamic routes and streaming responses

#### Hono.js Adapter

The Hono.js adapter provides a lightweight, fast HTTP interface:

```typescript
// app.ts
import LangGraphApp from '@langgraph-js/pure-graph/dist/adator/hono/index';

const app = new Hono<{ Variables: LangGraphServerContext }>();
app.route('/', LangGraphApp);
```

Key features:

-   Minimal overhead with Hono's performance optimizations
-   Built-in CORS support
-   Context passing via `c.set('langgraph_context', data)`

### API Layer

The API layer implements the LangGraph SDK-compatible REST endpoints:

#### Assistants API

-   `GET /assistants` - Search and list available graph assistants
-   `GET /assistants/{assistantId}` - Retrieve graph metadata and configuration

#### Threads API

-   `POST /threads` - Create new conversation threads
-   `GET /threads` - List and search threads with filtering options
-   `GET /threads/{threadId}` - Retrieve thread details and state
-   `DELETE /threads/{threadId}` - Delete threads and associated data

#### Runs API

-   `POST /threads/{threadId}/runs` - Execute graph runs
-   `GET /threads/{threadId}/runs/{runId}/stream` - Stream run results in real-time
-   `DELETE /threads/{threadId}/runs/{runId}` - Cancel running executions

### Storage Layer

Pure Graph supports multiple storage backends with automatic failover and configuration-based selection:

#### Checkpoint Storage

Checkpoints persist graph state between executions:

```typescript
// Priority-based selection
1. Redis (if REDIS_URL set and CHECKPOINT_TYPE matches)
2. PostgreSQL (if DATABASE_URL set)
3. SQLite (if SQLITE_DATABASE_URI set)
4. Memory (fallback default)
```

#### Message Queues

Message queues handle real-time streaming data:

```typescript
// Automatic selection based on Redis availability
if (process.env.REDIS_URL) {
    // Redis-based queue with TTL management
} else {
    // Memory-based queue
}
```

### Thread Manager

The thread manager coordinates the entire conversation lifecycle:

-   **Thread Creation**: Initialize new conversation contexts
-   **State Persistence**: Save and restore thread state across sessions
-   **Metadata Management**: Handle thread metadata and search indexing
-   **Lifecycle Events**: Track thread status changes and cleanup

## Data Flow

```
1. HTTP Request → Framework Adapter
2. Request Validation → API Layer
3. Context Injection → RunnableConfig
4. Graph Execution → LangGraph Workflow
5. State Checkpointing → Storage Layer
6. Result Streaming → Message Queue
7. HTTP Response → Framework Adapter
```

## Configuration System

Pure Graph uses environment variables for configuration with sensible defaults:

### Environment Variables

| Variable              | Description                  | Default  |
| --------------------- | ---------------------------- | -------- |
| `CHECKPOINT_TYPE`     | Storage backend type         | `memory` |
| `DATABASE_URL`        | PostgreSQL connection string | -        |
| `SQLITE_DATABASE_URI` | SQLite database path         | -        |
| `REDIS_URL`           | Redis connection URL         | -        |
| `DATABASE_INIT`       | Initialize database schema   | `false`  |

### Runtime Initialization

Global components are initialized once per application lifecycle:

```typescript
// Global initialization (handled automatically)
const globalCheckPointer = await createCheckPointer();
const globalMessageQueue = await createMessageQueue();
const globalThreadsManager = await createThreadManager({
    checkpointer: globalCheckPointer,
});
```

## Type System

Pure Graph leverages TypeScript and Zod for comprehensive type safety:

-   **Compile-time Safety**: Full TypeScript definitions for all APIs
-   **Runtime Validation**: Zod schemas validate all input/output data
-   **Framework Integration**: Type-safe context passing between layers

## Performance Considerations

### Memory Management

-   Lazy initialization prevents unnecessary resource allocation
-   TTL-based cleanup for Redis storage
-   Automatic queue management and garbage collection

### Scalability

-   Stateless API design allows horizontal scaling
-   Database connection pooling for PostgreSQL
-   Redis clustering support for high availability

### Streaming Optimization

-   Chunked responses for large data transfers
-   Compression support for message queues
-   Connection pooling and keep-alive management
