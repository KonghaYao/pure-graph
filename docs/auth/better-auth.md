---
title: Better Auth
---

# Better Auth

Better Auth provides a complete authentication solution for Open LangGraph Server with support for multiple providers and session management.

## Installation

```bash
npm install better-auth
```

## Configuration

Add the required environment variables:

```bash
BETTER_AUTH_SECRET=<generate-a-secret-key>
BETTER_AUTH_URL=<url-of-your-server>
```

## Setup

### 1. Create Auth Instance

```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    trustedOrigins: ['http://localhost:3000'], // Your frontend URL
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
    },
});

export type AuthType = {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
};
```

### 2. Create Auth Routes

```typescript
// routes/auth.ts
import { Hono } from 'hono';
import { auth } from '../lib/auth';
import type { AuthType } from '../lib/auth';

const router = new Hono<{ Variables: AuthType }>({
    strict: false,
});

router.on(['POST', 'GET'], '/auth/*', (c) => {
    return auth.handler(c.req.raw);
});

export default router;
```

### 3. Mount Routes

```typescript
// app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AuthType } from './lib/auth';
import auth from './routes/auth';

const app = new Hono<{ Variables: AuthType }>({
    strict: false,
});

// Enable CORS
app.use(cors());

// Mount auth routes
app.basePath('/api').route('/', auth);

// Your other routes and LangGraph integration
// ...

export default app;
```

## Integration with LangGraph

Use Better Auth sessions in your graph workflows by accessing the session data:

```typescript
// In your graph logic
import { entrypoint } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const workflow = entrypoint('authenticated-workflow', async (state, config) => {
    // Access session from context
    const session = config.configurable?.session;

    if (!session?.user) {
        throw new Error('Authentication required');
    }

    // Use session data in your workflow
    const agent = createReactAgent({
        llm: new ChatOpenAI(),
        prompt: `You are helping user: ${session.user.name}`,
        tools: [], // Add your tools
    });

    return await agent.invoke(state);
});
```

## Complete Hono Integration

Here's a complete example of integrating Better Auth with Open LangGraph Server:

```typescript
// app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Import Better Auth
import { auth as BetterAuth, type AuthType } from './lib/auth';

// Import LangGraph
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index';

// Import Hono
import { MiddlewareHandler } from 'hono';

// Custom auth middleware to inject session into LangGraph context
export const auth: MiddlewareHandler<{
    Variables: LangGraphServerContext;
}> = async (c, next) => {
    // Allow OPTIONS requests to pass through for CORS preflight
    if (c.req.method === 'OPTIONS') {
        return await next();
    }

    const session = await BetterAuth.api.getSession({
        headers: c.req.raw.headers,
    });

    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    } else {
        c.set('langgraph_context', {
            userId: session.user.id,
            // Add additional session data as needed
            // sessionId: session.session.id,
            // email: session.user.email,
            // name: session.user.name,
        });
        await next();
    }
};

const app = new Hono<{ Variables: LangGraphServerContext }>();

// Enable CORS and logging
app.use(cors());
app.use(logger());

// Create auth router
const authRouter = new Hono<{ Bindings: AuthType }>({
    strict: false,
});

authRouter.on(['POST', 'GET'], '/*', (c) => {
    return betterAuth.handler(c.req.raw);
});

// Mount routes
app.route('/api/auth', authRouter);

// Apply auth middleware to LangGraph routes
app.use('/*', auth);

// Mount LangGraph app
app.route('/api/langgraph', LangGraphApp);

// Add other authenticated routes
// These routes will also be protected by the auth middleware
// app.route('/api/files', filesRouter);
// app.route('/api/user', userRouter);

export default app;
```

## Middleware Details

The `auth` middleware function:

1. **Handles CORS preflight** requests (OPTIONS) by allowing them to pass through
2. **Validates sessions** using Better Auth's `getSession` API
3. **Returns 401 error** for unauthorized requests
4. **Injects user context** into the LangGraph request via `langgraph_context`
5. **Makes session data available** in your graph workflows through `config.configurable`

This middleware is applied to all routes (`'/*'`) to ensure consistent authentication across your entire application.

## Accessing Context in Graphs

```typescript
import { entrypoint } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const workflow = entrypoint('authenticated-workflow', async (state, config) => {
    // Access authenticated user data
    const userId = config.configurable?.userId;
    const userEmail = config.configurable?.email;
    const userName = config.configurable?.name;

    if (!userId) {
        throw new Error('Authentication required');
    }

    // Use user data in your workflow
    const agent = createReactAgent({
        llm: new ChatOpenAI(),
        prompt: `You are helping ${userName} (${userEmail}). Provide personalized assistance.`,
        tools: [], // Add your tools
    });

    return await agent.invoke(state);
});
```
