---
title: Standard Fetch Handler
---

# Standard Fetch Handler

The standard fetch handler is the core implementation of Open LangGraph Server, built entirely on Web Standards (WHATWG Fetch API). It provides a framework-agnostic way to integrate LangGraph into any platform that supports standard `Request`/`Response` APIs.

## Why Use the Fetch Handler?

-   **Platform Agnostic**: Works on any platform supporting standard Web APIs
-   **Zero Framework Overhead**: No framework dependencies to manage
-   **Maximum Portability**: Deploy the same code to multiple platforms
-   **Future Proof**: Based on web standards, not proprietary APIs

## Supported Platforms

The fetch handler works on:

| Platform                | Status             | Notes                          |
| ----------------------- | ------------------ | ------------------------------ |
| **Cloudflare Workers**  | ✅ Fully Supported | Recommended for edge computing |
| **Deno Deploy**         | ✅ Fully Supported | Native TypeScript support      |
| **Vercel Edge**         | ✅ Fully Supported | Edge runtime compatible        |
| **Bun**                 | ✅ Fully Supported | Fast JavaScript runtime        |
| **Node.js**             | ✅ Fully Supported | Via Hono or direct usage       |
| **Custom Platforms**    | ✅ Fully Supported | Any Web API-compliant platform |

## Installation

```bash
npm install @langgraph-js/pure-graph @langchain/langgraph @langchain/core
```

## Basic Usage

### Simple Handler

```typescript
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/graph';

// Register your graph
registerGraph('my-assistant', graph);

// Export the handler
export default async function handler(req: Request) {
    return await handleRequest(req);
}
```

### With Context

```typescript
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/graph';

registerGraph('my-assistant', graph);

export default async function handler(req: Request) {
    // Extract context from request
    const context = {
        langgraph_context: {
            userId: req.headers.get('x-user-id') || 'anonymous',
            sessionId: req.headers.get('x-session-id'),
            timestamp: new Date().toISOString(),
        },
    };

    return await handleRequest(req, context);
}
```

## Platform-Specific Examples

### Cloudflare Workers

```typescript
// src/index.ts
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/graph';

registerGraph('my-assistant', graph);

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Access Cloudflare environment variables
        const context = {
            langgraph_context: {
                userId: request.headers.get('x-user-id'),
                environment: env.ENVIRONMENT,
                // Add any Cloudflare bindings or KV data
            },
        };

        return await handleRequest(request, context);
    },
};
```

**Environment Setup:**

```toml
# wrangler.toml
name = "langgraph-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
SQLITE_DATABASE_URI = "./.langgraph_api/chat.db"
```

### Deno Deploy

```typescript
// main.ts
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/graph.ts';

registerGraph('my-assistant', graph);

Deno.serve(async (req) => {
    // Access Deno environment
    const context = {
        langgraph_context: {
            userId: req.headers.get('x-user-id'),
            deploymentId: Deno.env.get('DENO_DEPLOYMENT_ID'),
        },
    };

    return await handleRequest(req, context);
});
```

**Environment Setup:**

```bash
# .env
SQLITE_DATABASE_URI=./.langgraph_api/chat.db
DATABASE_URL=postgresql://user:pass@host/db
CHECKPOINT_TYPE=postgres
```

### Vercel Edge Functions

```typescript
// api/langgraph.ts
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from '../agent/graph';

registerGraph('my-assistant', graph);

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const context = {
        langgraph_context: {
            userId: req.headers.get('x-user-id'),
            region: process.env.VERCEL_REGION,
        },
    };

    return await handleRequest(req, context);
}
```

**Environment Setup:**

Configure environment variables in Vercel dashboard:
-   `DATABASE_URL`
-   `REDIS_URL`
-   `CHECKPOINT_TYPE`

### Bun

```typescript
// server.ts
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './agent/graph';

registerGraph('my-assistant', graph);

Bun.serve({
    port: 3000,
    async fetch(req) {
        const context = {
            langgraph_context: {
                userId: req.headers.get('x-user-id'),
                runtime: 'bun',
            },
        };

        return await handleRequest(req, context);
    },
});

console.log('Server running on http://localhost:3000');
```

## Configuration

### Environment Variables

All platforms support standard environment variables:

```bash
# Database Configuration
SQLITE_DATABASE_URI=./.langgraph_api/chat.db
DATABASE_URL=postgresql://username:password@host:5432/db
DATABASE_INIT=true  # Only for initial PostgreSQL setup

# Redis Configuration
REDIS_URL=redis://localhost:6379
CHECKPOINT_TYPE=postgres  # or redis, shallow/redis

# Optional Settings
HEARTBEAT_INTERVAL=1500  # SSE heartbeat interval in ms
```

### Storage Backends

The fetch handler supports all storage backends:

-   **Memory**: Default, no configuration needed
-   **SQLite**: Set `SQLITE_DATABASE_URI`
-   **PostgreSQL**: Set `DATABASE_URL` and `CHECKPOINT_TYPE=postgres`
-   **Redis**: Set `REDIS_URL` and `CHECKPOINT_TYPE=redis`

## API Endpoints

The fetch handler implements all LangGraph Server endpoints:

### Assistants

-   `POST /assistants/search` - Search assistants
-   `GET /assistants/:id/graph` - Get assistant graph

### Threads

-   `POST /threads` - Create thread
-   `POST /threads/search` - Search threads
-   `GET /threads/:id` - Get thread
-   `DELETE /threads/:id` - Delete thread
-   `POST /threads/:id/state` - Update thread state

### Runs

-   `POST /threads/:id/runs/stream` - Stream a new run
-   `GET /threads/:id/runs/:runId/stream` - Join existing stream
-   `GET /threads/:id/runs` - List runs
-   `POST /threads/:id/runs/:runId/cancel` - Cancel run

## Advanced Usage

### Custom Route Handling

```typescript
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';

export default async function handler(req: Request) {
    const url = new URL(req.url);

    // Handle custom routes
    if (url.pathname === '/health') {
        return new Response('OK', { status: 200 });
    }

    if (url.pathname === '/metrics') {
        return new Response(JSON.stringify(getMetrics()), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Handle LangGraph routes
    if (url.pathname.startsWith('/api/langgraph')) {
        // Strip prefix if needed
        const modifiedReq = new Request(
            req.url.replace('/api/langgraph', ''),
            req
        );
        return await handleRequest(modifiedReq);
    }

    return new Response('Not Found', { status: 404 });
}
```

### Authentication Middleware

```typescript
async function withAuth(req: Request): Promise<Response> {
    const authHeader = req.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);

    if (!user) {
        return new Response('Invalid token', { status: 401 });
    }

    // Add user to context
    const context = {
        langgraph_context: {
            userId: user.id,
            email: user.email,
            permissions: user.permissions,
        },
    };

    return await handleRequest(req, context);
}

export default withAuth;
```

### Rate Limiting

```typescript
const rateLimits = new Map<string, number[]>();

async function withRateLimit(req: Request): Promise<Response> {
    const userId = req.headers.get('x-user-id') || 'anonymous';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100;

    const userRequests = rateLimits.get(userId) || [];
    const recentRequests = userRequests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
        return new Response('Rate limit exceeded', { status: 429 });
    }

    recentRequests.push(now);
    rateLimits.set(userId, recentRequests);

    return await handleRequest(req, {
        langgraph_context: { userId },
    });
}

export default withRateLimit;
```

### CORS Configuration

```typescript
function withCORS(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') {
        return withCORS(new Response(null, { status: 204 }));
    }

    const response = await handleRequest(req);
    return withCORS(response);
}
```

## Performance Considerations

### Connection Pooling

For database-heavy workloads, configure connection pooling:

```typescript
// For PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
});
```

### Caching

Implement caching for frequently accessed data:

```typescript
const cache = new Map();

async function withCache(req: Request): Promise<Response> {
    const cacheKey = `${req.method}:${req.url}`;

    if (req.method === 'GET' && cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) {
            return new Response(cached.body, cached.init);
        }
    }

    const response = await handleRequest(req);

    if (req.method === 'GET' && response.status === 200) {
        cache.set(cacheKey, {
            body: await response.clone().text(),
            init: {
                status: response.status,
                headers: response.headers,
            },
            timestamp: Date.now(),
        });
    }

    return response;
}
```

## Troubleshooting

### "Module not found" errors

Ensure you're using the correct import path:

```typescript
// Correct
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';

// Incorrect
import { handleRequest } from '@langgraph-js/pure-graph/fetch';
```

### Streaming not working

Ensure your platform supports streaming responses:
-   Cloudflare Workers: ✅ Supported
-   Deno Deploy: ✅ Supported  
-   Vercel Edge: ✅ Supported (with caveats)
-   Bun: ✅ Supported

### Context not accessible in graph

Verify context structure matches expected format:

```typescript
const context = {
    langgraph_context: {
        // Your context fields here
        userId: 'user123',
    },
};
```

### Database connection issues

-   Check environment variables are set correctly
-   Verify network access to database
-   Ensure database is initialized (`DATABASE_INIT=true` for first run)

## Migration from Framework Adapters

Migrating from Hono or Next.js adapters is straightforward:

### From Hono

```typescript
// Before (Hono)
import LangGraphApp from '@langgraph-js/pure-graph/dist/adapter/hono';
app.route('/api', LangGraphApp);

// After (Fetch)
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
app.all('*', async (c) => {
    const context = { langgraph_context: c.get('langgraph_context') };
    return await handleRequest(c.req.raw, context);
});
```

### From Next.js

```typescript
// Before (Next.js)
export { GET, POST, DELETE } from '@langgraph-js/pure-graph/dist/adapter/nextjs/router';

// After (Fetch)
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';

export async function GET(req: NextRequest) {
    return await handleRequest(req);
}

export async function POST(req: NextRequest) {
    return await handleRequest(req);
}

export async function DELETE(req: NextRequest) {
    return await handleRequest(req);
}
```

## Next Steps

-   [Architecture Overview](/docs/getting-started/architecture) - Understand the layered design
-   [Storage Configuration](/docs/storage/overview) - Configure persistence
-   [Authentication](/docs/auth/overview) - Secure your endpoints
-   [API Reference](/docs/api/overview) - Complete API documentation

