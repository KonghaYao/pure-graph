---
title: Custom Auth
---

# Custom Auth

Implement simple custom authentication for Open LangGraph Server using API keys or tokens.

## API Key Authentication

### Environment Setup

Add your API keys to environment variables:

```bash
# .env
API_KEY_1=your-secret-api-key-1
API_KEY_2=your-secret-api-key-2
```

### Hono Implementation

```typescript
// lib/auth.ts
export function validateApiKey(apiKey: string | null): boolean {
  if (!apiKey) return false

  const validKeys = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    // Add more keys as needed
  ].filter(Boolean)

  return validKeys.includes(apiKey)
}
```

```typescript
// app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index'
import { validateApiKey } from './lib/auth'

const app = new Hono<{ Variables: LangGraphServerContext }>()

app.use(cors())

// Simple API key auth
app.use('/api/langgraph/*', async (c, next) => {
  const apiKey = c.req.header('x-api-key') || c.req.query('api_key')

  if (!validateApiKey(apiKey)) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  // Set basic context
  c.set('langgraph_context', {
    userId: 'api-user', // Or extract from API key mapping
  })

  await next()
})

app.route('/api/langgraph', LangGraphApp)

export default app
```

## JWT Token Authentication

### Setup

```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### Implementation

```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken'

export interface JWTPayload {
  userId: string
  email: string
  role?: string
}

export function validateJWT(token: string | null): JWTPayload | null {
  if (!token) return null

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET!) as JWTPayload
    return decoded
  } catch {
    return null
  }
}
```

```typescript
// app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import LangGraphApp, { type LangGraphServerContext } from '@langgraph-js/pure-graph/dist/adapter/hono/index'
import { validateJWT } from './lib/auth'

const app = new Hono<{ Variables: LangGraphServerContext }>()

app.use(cors())

// JWT auth
app.use('/api/langgraph/*', async (c, next) => {
  const token = c.req.header('authorization')
  const payload = validateJWT(token)

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  // Set user context
  c.set('langgraph_context', {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })

  await next()
})

app.route('/api/langgraph', LangGraphApp)

export default app
```

## Using Context in Graphs

```typescript
import { entrypoint, getConfig } from '@langchain/langgraph'
import { createReactAgent } from '@langchain/langgraph/prebuilt'

const workflow = entrypoint('authenticated-workflow', async (state, config) => {
  const userId = config.configurable?.userId
  const email = config.configurable?.email

  if (!userId) {
    throw new Error('Authentication required')
  }

  const agent = createReactAgent({
    llm: new ChatOpenAI(),
    prompt: `You are helping user ${email || userId}`,
    tools: [], // Add your tools
  })

  return await agent.invoke(state)
})
```

## Client Usage

### API Key

```typescript
// Client side
const response = await fetch('/api/langgraph/threads', {
  headers: {
    'x-api-key': 'your-secret-api-key',
    'Content-Type': 'application/json',
  },
})
```

### JWT Token

```typescript
// Client side
const response = await fetch('/api/langgraph/threads', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json',
  },
})
```
