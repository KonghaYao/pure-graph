---
title: Hono.js
---

# Hono.js Integration Guide

Open LangGraph Server integrates seamlessly with Hono.js applications, providing a lightweight and fast HTTP interface for your LangGraph workflows. This guide covers everything you need to set up and use Open LangGraph Server with Hono.js.

## Installation

Install Open LangGraph Server and required dependencies:

```bash
npm install @langgraph-js/pure-graph @langchain/langgraph @langchain/core hono
```

For OpenAI integration:

```bash
npm install @langchain/openai
```

## Basic Setup

### Project Structure

Recommended structure for Hono.js applications:

```
my-hono-app/
├── src/
│   ├── agent/
│   │   ├── index.ts          # Graph registration
│   │   └── my-graph.ts       # Graph definitions
│   ├── app.ts                # Main application
│   └── types.ts              # Type definitions
├── .env                      # Environment variables
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

### 1. Create the Main Application

Set up your Hono application with Open LangGraph Server:

```typescript
// src/app.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/my-graph';
import { Hono } from 'hono';
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';

// Register your graphs
registerGraph('my-assistant', graph);

const app = new Hono<{ Variables: LangGraphServerContext }>();

// Add CORS support (recommended)
app.use('*', async (c, next) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (c.req.method === 'OPTIONS') {
        return c.text('', 200);
    }
    await next();
});

// Mount Open LangGraph Server routes
app.route('/api', LangGraphApp);

export default app;
```

### 2. Define Your Graph

Create your LangGraph workflow:

```typescript
// src/agent/my-graph.ts
import { Annotation, entrypoint } from '@langchain/langgraph';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { ChatOpenAI } from '@langchain/openai';

const State = createState(createReactAgentAnnotation()).build({});

const workflow = entrypoint('my-assistant', async (state: typeof State.State) => {
    const agent = createReactAgent({
        llm: new ChatOpenAI({
            model: 'gpt-4',
        }),
        prompt: 'You are a helpful assistant.',
        tools: [], // Add your tools here
    });

    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
```

### 3. Register Graphs

Create a registration file:

```typescript
// src/agent/index.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './my-graph';

registerGraph('my-assistant', graph);
export {};
```

### 4. Start the Server

Create your server entry point:

```typescript
// src/server.ts
import app from './app';
import { serve } from '@hono/node-server';

const port = process.env.PORT || 3000;

serve({
    fetch: app.fetch,
    port: Number(port),
});

console.log(`Server running on http://localhost:${port}`);
```

## Configuration

### Environment Variables

Configure storage and other settings:

```bash
# .env
# Storage Configuration
SQLITE_DATABASE_URI=./.langgraph_api/chat.db

# Or for PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost:5432/langgraph_db
# DATABASE_INIT=true

# Redis (optional)
# REDIS_URL=redis://localhost:6379
# CHECKPOINT_TYPE=redis

# Server
PORT=3000
```

### Storage Setup

#### SQLite (Development)

```bash
mkdir -p .langgraph_api
# Database created automatically on first run
```

#### PostgreSQL (Production)

```bash
# Initialize database
export DATABASE_INIT=true
npm run dev
unset DATABASE_INIT
```

## Context Injection

Inject custom context into your graphs using Hono middleware:

```typescript
// src/app.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/context-aware-graph';
import { Hono } from 'hono';
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';

registerGraph('context-aware-assistant', graph);

const app = new Hono<{ Variables: LangGraphServerContext }>();

// Context injection middleware
app.use('/api/langgraph/*', async (c, next) => {
    // Extract context from headers, JWT, etc.
    const userId = c.req.header('x-user-id') || 'anonymous';
    const sessionId = c.req.header('x-session-id') || 'session-123';
    const authToken = c.req.header('authorization');

    // Validate token and get user data
    const userData = await validateAuthToken(authToken);

    c.set('langgraph_context', {
        userId: userData.id,
        sessionId,
        preferences: userData.preferences,
        metadata: {
            source: 'hono-api',
            timestamp: new Date().toISOString(),
            ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        },
        // Add any custom data your graphs need
        customField: 'value',
    });

    await next();
});

app.route('/api', LangGraphApp);

export default app;
```

Access context in your graph:

```typescript
// src/agent/context-aware-graph.ts
import { getConfig } from '@langchain/langgraph';

const workflow = entrypoint('context-aware-assistant', async (state) => {
    const config = getConfig();

    // Access injected context
    const userId = config.configurable?.userId;
    const preferences = config.configurable?.preferences;
    const metadata = config.configurable?.metadata;

    console.log('Request context:', {
        userId,
        sessionId: config.configurable?.sessionId,
        source: metadata?.source,
    });

    const systemMessage = `You are a helpful assistant for user ${userId}.
    User preferences: ${JSON.stringify(preferences || {})}`;

    const agent = createReactAgent({
        llm: new ChatOpenAI({ model: 'gpt-4' }),
        prompt: systemMessage,
        tools: [],
    });

    return agent.invoke(state);
});
```

## API Usage Examples

### Creating a Thread

```typescript
// Create a new conversation thread
const response = await fetch('http://localhost:3000/api/threads', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user123',
        'x-session-id': 'session456',
    },
    body: JSON.stringify({
        metadata: {
            title: 'My Conversation',
            tags: ['general'],
        },
    }),
});

const thread = await response.json();
console.log('Created thread:', thread.thread_id);
```

### Running a Graph

```typescript
// Execute a graph run
const response = await fetch(`http://localhost:3000/api/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user123',
        'x-session-id': 'session456',
    },
    body: JSON.stringify({
        assistant_id: 'my-assistant',
        input: {
            messages: [{ role: 'user', content: 'Hello!' }],
        },
        stream_mode: ['messages'],
    }),
});

if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

// Handle streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.event === 'messages') {
                console.log('New message:', data.data);
            }
        }
    }
}
```

### Listing Threads

```typescript
// Get user's threads
const response = await fetch('http://localhost:3000/api/threads', {
    headers: {
        'x-user-id': 'user123',
    },
});

const threads = await response.json();
console.log('User threads:', threads);
```

## Advanced Configuration

### Custom Middleware Stack

Build complex middleware chains:

```typescript
// src/middleware/auth.ts
export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.slice(7);
    const user = await verifyJWT(token);

    if (!user) {
        return c.json({ error: 'Invalid token' }, 401);
    }

    c.set('user', user);
    await next();
};

// src/middleware/rateLimit.ts
export const rateLimitMiddleware = async (c: Context, next: Next) => {
    const userId = c.get('user')?.id;
    const isAllowed = await checkRateLimit(userId);

    if (!isAllowed) {
        return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    await next();
};

// src/app.ts
app.use('/api/langgraph/*', authMiddleware);
app.use('/api/langgraph/*', rateLimitMiddleware);
app.use('/api/langgraph/*', contextInjectionMiddleware);
```

### Error Handling

Implement global error handling:

```typescript
// src/middleware/errorHandler.ts
export const errorHandler = async (c: Context, next: Next) => {
    try {
        await next();
    } catch (error) {
        console.error('API Error:', error);

        // Handle different error types
        if (error instanceof ValidationError) {
            return c.json({ error: 'Invalid input', details: error.details }, 400);
        }

        if (error instanceof AuthError) {
            return c.json({ error: 'Authentication failed' }, 401);
        }

        // Generic error
        return c.json({ error: 'Internal server error' }, 500);
    }
};

// Apply error handler
app.use('*', errorHandler);
```

### Logging and Monitoring

Add comprehensive logging:

```typescript
// src/middleware/logger.ts
export const loggerMiddleware = async (c: Context, next: Next) => {
    const start = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    console.log(`[${new Date().toISOString()}] ${method} ${path} - Start`);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    console.log(`[${new Date().toISOString()}] ${method} ${path} - ${status} (${duration}ms)`);

    // Log context for debugging
    const context = c.get('langgraph_context');
    if (context) {
        console.log('Context:', JSON.stringify(context, null, 2));
    }
};

app.use('/api/langgraph/*', loggerMiddleware);
```

## Performance Optimization

### Connection Pooling

For production deployments:

```typescript
// src/config/database.ts
import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
```

### Caching Strategy

Implement response caching:

```typescript
// src/middleware/cache.ts
const cache = new Map();

export const cacheMiddleware = async (c: Context, next: Next) => {
    const key = `${c.req.method}:${c.req.path}`;

    if (c.req.method === 'GET' && cache.has(key)) {
        const cached = cache.get(key);
        if (Date.now() - cached.timestamp < 300000) {
            // 5 minutes
            return c.json(cached.data);
        }
    }

    await next();

    if (c.req.method === 'GET' && c.res.status === 200) {
        cache.set(key, {
            data: await c.res.clone().json(),
            timestamp: Date.now(),
        });
    }
};
```

### Health Checks

Add health check endpoints:

```typescript
// src/routes/health.ts
import { Hono } from 'hono';

const health = new Hono();

health.get('/health', async (c) => {
    // Check database connectivity
    try {
        await checkDatabaseConnection();
        return c.json({ status: 'healthy', database: 'connected' });
    } catch (error) {
        return c.json({ status: 'unhealthy', database: 'disconnected' }, 503);
    }
});

health.get('/ready', async (c) => {
    // More thorough checks
    const checks = await Promise.all([checkDatabaseConnection(), checkRedisConnection(), checkLangGraphHealth()]);

    const allHealthy = checks.every((check) => check.healthy);

    return c.json(
        {
            status: allHealthy ? 'ready' : 'not ready',
            checks: checks,
        },
        allHealthy ? 200 : 503,
    );
});

export default health;
```

## Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Production Checklist

-   [ ] Set `NODE_ENV=production`
-   [ ] Configure proper logging
-   [ ] Set up database connection pooling
-   [ ] Configure Redis for caching and queues
-   [ ] Set up monitoring and alerting
-   [ ] Configure rate limiting
-   [ ] Set up SSL/TLS certificates
-   [ ] Configure backup strategies
-   [ ] Set up horizontal scaling if needed

## Troubleshooting

### Common Issues

**"Graph not found" error**

-   Verify graph registration in correct file
-   Check assistant_id matches registered name
-   Ensure imports are correct

**Context not available**

-   Check middleware order and execution
-   Verify context setting with `c.set()`
-   Debug context injection middleware

**Streaming failures**

-   Confirm Hono version supports streaming
-   Check network configuration
-   Verify client handles Server-Sent Events

**Database connection issues**

-   Check connection string format
-   Verify network connectivity
-   Confirm database server is running
-   Check user permissions and credentials
