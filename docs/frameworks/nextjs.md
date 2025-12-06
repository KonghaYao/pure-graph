---
title: Next.js
---

# Next.js Integration Guide

Open LangGraph Server provides seamless integration with Next.js applications through its App Router. This guide covers everything you need to know to get started with Open LangGraph Server in your Next.js project.

## Architecture Overview

The Next.js adapter is a **thin wrapper** (~40 lines of code) around the core fetch handler. It:
-   Extracts context from the `x-langgraph-context` header
-   Handles Next.js-specific initialization patterns
-   Passes requests to the standard fetch implementation

```
Next.js Request → Extract Header Context → Core Fetch Handler → Response
```

This architecture provides:
-   ✅ Framework-agnostic core logic
-   ✅ Consistent behavior across all platforms
-   ✅ Easy migration if you switch frameworks

## Installation

Install Open LangGraph Server alongside your LangGraph dependencies:

```bash
npm install @langgraph-js/pure-graph @langchain/langgraph @langchain/core
```

For OpenAI integration (optional):

```bash
npm install @langchain/openai
```

## Project Structure

Recommended project structure for Next.js integration:

```
my-nextjs-app/
├── app/
│   ├── api/
│   │   └── langgraph/
│   │       └── [...path]/
│   │           └── route.ts      # LangGraph API endpoint
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Your page
├── agent/
│   └── index.ts                  # Graph registration
├── middleware.ts                 # Context injection (optional)
├── .env.local                    # Environment variables
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Basic Setup

### 1. Create the API Route

Create a new API route handler in your Next.js app:

```typescript
// app/api/langgraph/[...path]/route.ts
import { NextRequest } from 'next/server';
import { ensureInitialized } from '@langgraph-js/pure-graph/dist/adapter/nextjs/index';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const registerGraph = async () => {
    // Separate graph registration to avoid Next.js context isolation
    await import('@/agent/index');
};

export const GET = async (req: NextRequest) => {
    const { GET } = await ensureInitialized(registerGraph);
    return GET(req);
};

export const POST = async (req: NextRequest) => {
    const { POST } = await ensureInitialized(registerGraph);
    return POST(req);
};

export const DELETE = async (req: NextRequest) => {
    const { DELETE } = await ensureInitialized(registerGraph);
    return DELETE(req);
};
```

> **Important**: The Next.js adapter handles the framework's specific initialization requirements while using the same core fetch handler as other platforms. This ensures consistent API behavior across all deployments.

### 2. Register Your Graphs

Create a separate file for graph registration:

```typescript
// agent/index.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './my-graph';

registerGraph('my-assistant', graph);
export {};
```

### 3. Create Your Graph

Define your LangGraph workflow:

```typescript
// agent/my-graph.ts
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

## Configuration

### Environment Variables

Configure your storage backend and other settings:

```bash
# .env.local
# Database Configuration
SQLITE_DATABASE_URI=./.langgraph_api/chat.db
# or for PostgreSQL:
# DATABASE_URL=postgresql://username:password@localhost:5432/langgraph_db
# DATABASE_INIT=true

# Redis (optional)
# REDIS_URL=redis://localhost:6379
# CHECKPOINT_TYPE=redis
```

### Storage Setup

#### SQLite (Recommended for Development)

```bash
# Create database directory
mkdir -p .langgraph_api

# The database will be created automatically on first run
```

#### PostgreSQL (Recommended for Production)

```bash
# Set DATABASE_INIT=true for initial setup
export DATABASE_INIT=true
npm run dev  # Run once to initialize tables
unset DATABASE_INIT
```

## Advanced Usage

### Context Injection with Middleware

Inject user-specific context into your graphs:

```typescript
// middleware.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    if (request.nextUrl.pathname.startsWith('/api/langgraph/')) {
        // Extract user context from cookies/headers
        const userId = request.cookies.get('user-id')?.value || 'anonymous';
        const sessionId = request.cookies.get('session-id')?.value || 'session-123';

        const langgraphContext = {
            userId,
            sessionId,
            preferences: { theme: 'dark', language: 'en' },
            metadata: {
                source: 'nextjs-app',
                timestamp: new Date().toISOString(),
            },
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

Access context in your graph:

```typescript
// agent/context-aware-graph.ts
import { getConfig } from '@langchain/langgraph';

const workflow = entrypoint('context-aware-assistant', async (state) => {
    const config = getConfig();

    // Access injected context
    const userId = config.configurable?.userId;
    const preferences = config.configurable?.preferences;

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

### Streaming Responses

Handle streaming responses in your client components:

```typescript
// components/ChatInterface.tsx
'use client';

import { useState } from 'react';

export default function ChatInterface() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [threadId, setThreadId] = useState(null);

    const sendMessage = async () => {
        // Create thread if not exists
        if (!threadId) {
            const threadResponse = await fetch('/api/langgraph/threads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            const thread = await threadResponse.json();
            setThreadId(thread.thread_id);
        }

        // Start streaming run
        const response = await fetch(`/api/langgraph/threads/${threadId}/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: 'my-assistant',
                input: { messages: [{ role: 'user', content: input }] },
                stream_mode: ['messages'],
            }),
        });

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
                        setMessages((prev) => [...prev, data.data]);
                    }
                }
            }
        }

        setInput('');
    };

    return (
        <div>
            <div>
                {messages.map((msg, i) => (
                    <div key={i}>{msg.content}</div>
                ))}
            </div>
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
        </div>
    );
}
```

## Error Handling

Implement proper error handling for API calls:

```typescript
// lib/langgraph-client.ts
export class LangGraphClient {
    async createThread() {
        try {
            const response = await fetch('/api/langgraph/threads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to create thread:', error);
            throw error;
        }
    }

    async *streamRun(threadId: string, assistantId: string, input: any) {
        try {
            const response = await fetch(`/api/langgraph/threads/${threadId}/runs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assistant_id: assistantId,
                    input,
                    stream_mode: ['messages', 'values'],
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            yield data;
                        } catch (parseError) {
                            console.warn('Failed to parse streaming data:', parseError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming failed:', error);
            throw error;
        }
    }
}
```

## Deployment Considerations

### Environment Variables

Ensure all required environment variables are set in your deployment platform:

```bash
# Production environment
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CHECKPOINT_TYPE=postgres
```

### Database Migration

For production deployments with PostgreSQL:

```bash
# Run database migrations on deployment
export DATABASE_INIT=true
npm run build  # This will trigger initialization if needed
unset DATABASE_INIT
```

### Performance Optimization

-   Use Redis for checkpoint storage in production
-   Configure connection pooling for database connections
-   Implement proper caching strategies for frequently accessed data
-   Monitor memory usage and adjust TTL settings as needed

## Troubleshooting

### Common Issues

**"Graph not found" error**

-   Ensure your graph is properly registered in `agent/index.ts`
-   Check that the `assistant_id` matches the registered graph name

**"Database connection failed"**

-   Verify environment variables are correctly set
-   Check database server connectivity
-   Ensure proper permissions for database user

**Streaming not working**

-   Confirm `stream_mode` is set correctly in run requests
-   Check browser compatibility for Server-Sent Events
-   Verify middleware is not interfering with streaming responses

**Context not injected**

-   Ensure middleware is configured correctly
-   Check that `x-langgraph-context` header is being set
-   Verify context format matches expected structure

## Alternative: Direct Fetch Handler

For simpler use cases or if you prefer direct control, you can use the core fetch handler:

```typescript
// app/api/langgraph/[...path]/route.ts
import { NextRequest } from 'next/server';
import { handleRequest } from '@langgraph-js/pure-graph/dist/adapter/fetch';
import { LangGraphGlobal } from '@langgraph-js/pure-graph/dist/global';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize once
let initialized = false;
async function ensureInit() {
    if (!initialized) {
        await LangGraphGlobal.initGlobal();
        await import('@/agent/index');
        initialized = true;
    }
}

export async function GET(req: NextRequest) {
    await ensureInit();

    // Extract context from headers
    const contextHeader = req.headers.get('x-langgraph-context');
    const context = contextHeader 
        ? { langgraph_context: JSON.parse(decodeURIComponent(contextHeader)) }
        : {};

    return await handleRequest(req, context);
}

export async function POST(req: NextRequest) {
    await ensureInit();

    const contextHeader = req.headers.get('x-langgraph-context');
    const context = contextHeader 
        ? { langgraph_context: JSON.parse(decodeURIComponent(contextHeader)) }
        : {};

    return await handleRequest(req, context);
}

export async function DELETE(req: NextRequest) {
    await ensureInit();

    const contextHeader = req.headers.get('x-langgraph-context');
    const context = contextHeader 
        ? { langgraph_context: JSON.parse(decodeURIComponent(contextHeader)) }
        : {};

    return await handleRequest(req, context);
}
```

This approach gives you full control while still using the same core implementation as other platforms.

## Migration Benefits

Using the Next.js adapter (or fetch handler) provides:

-   **Platform Flexibility**: Same API logic can run on Vercel, Cloudflare, or any Node.js server
-   **Consistent Behavior**: Identical API responses across all platforms
-   **Standard Web APIs**: Based on WHATWG Fetch specification
-   **Future Proof**: Not locked into Next.js-specific APIs

## Comparison with Other Platforms

| Feature | Next.js Adapter | Hono Adapter | Direct Fetch |
|---------|----------------|--------------|--------------|
| **Framework** | Next.js App Router | Hono.js | Any |
| **Context Source** | `x-langgraph-context` header | Hono context variable | Custom |
| **Initialization** | `ensureInitialized()` | Standard | Manual |
| **Code Size** | ~40 lines | ~30 lines | 0 lines |
| **Core Logic** | ✅ Same | ✅ Same | ✅ Same |

All adapters use the **exact same core implementation**, ensuring consistent behavior across platforms.

## Next Steps

-   [Architecture Overview](/docs/getting-started/architecture) - Understand the layered design
-   [Standard Fetch Handler](/docs/frameworks/fetch) - Learn about the core implementation
-   [Hono.js Integration](/docs/frameworks/hono) - Compare with other frameworks
-   [Storage Configuration](/docs/storage/overview) - Configure persistence
-   [Authentication](/docs/auth/overview) - Secure your endpoints
