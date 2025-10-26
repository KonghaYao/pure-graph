---
title: 1.x to 2.0
---

# Migration Guide: Pure Graph 1.x to 2.0

This guide helps you migrate your Pure Graph applications from version 1.x to 2.0, which introduces full support for LangGraph 1.0.

## Overview

Pure Graph 2.0 introduces several breaking changes and improvements:

-   Full LangGraph 1.0 compatibility
-   New `entrypoint` API pattern
-   Enhanced state management with improved Zod integration
-   Updated dependencies and minimum Node.js version

## Breaking Changes

### Minimum Requirements

-   **Node.js**: 18.0.0+ (previously 16.0.0)
-   **LangGraph**: 1.0+ (previously 0.1+)

### Dependencies

Update your `package.json`:

```json
{
    "dependencies": {
        "@langgraph-js/pure-graph": "^2.0.0",
        "@langchain/langgraph": "^1.0.0",
        "@langchain/core": "^1.0.0"
    }
}
```

## Migration Steps

### 1. Update Dependencies

```bash
npm update @langgraph-js/pure-graph@^2.0.0
npm update @langchain/langgraph@^1.0.0
```

### 2. Replace StateGraph with Entrypoint Pattern

#### Before (1.x)

```typescript
import { StateGraph, START } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const State = {
    messages: { value: (x, y) => y, default: () => [] },
};

const workflow = new StateGraph(State)
    .addNode(
        'agent',
        createReactAgent({
            llm: new ChatOpenAI({ model: 'gpt-4' }),
            tools: [],
        }),
    )
    .addEdge(START, 'agent');

export const graph = workflow.compile();
```

#### After (2.0) - Recommended

```typescript
import { entrypoint, getConfig } from '@langchain/langgraph';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { z } from 'zod';
import { withLangGraph, MessagesZodMeta } from '@langchain/langgraph/zod';
import { createAgent } from 'langchain';

const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});

const workflow = entrypoint('my-workflow', async (state: z.infer<typeof State>) => {
    // Access context data
    const config = getConfig();
    const userId = config.configurable?.userId;

    const agent = createAgent({
        model: new ChatOpenAI({ model: 'gpt-4' }),
        systemPrompt: `You are a helpful assistant${userId ? ` for user ${userId}` : ''}`,
        tools: [],
    });

    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
}).compile();
```

### 3. Update State Definitions

#### Old State Definition (Annotation-based)

```typescript
import { Annotation } from '@langchain/langgraph';

const State = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
        default: () => [],
    }),
});
```

#### New State Definition (Zod-based) - Recommended

```typescript
import { z } from 'zod';
import { withLangGraph, MessagesZodMeta } from '@langchain/langgraph/zod';

const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});
```

### 4. Update Agent Creation

#### Before

```typescript
import { createReactAgent } from '@langchain/langgraph/prebuilt';

const agent = createReactAgent({
    llm: new ChatOpenAI({ model: 'gpt-4' }),
    tools: [tool1, tool2],
    prompt: 'You are a helpful assistant',
});
```

#### After (Context Access)

```typescript
import { createAgent } from 'langchain';

const agent = createAgent({
    model: new ChatOpenAI({ model: 'gpt-4' }),
    tools: [tool1, tool2],
    systemPrompt: 'You are a helpful assistant',
});
```

### 5. Update Context Access

#### Before

```typescript
// Context was passed differently in 1.x
const config = getConfig();
```

#### After (Context Access)

```typescript
// Context is now more reliable
const config = getConfig();
const userId = config.configurable?.userId;
const sessionId = config.configurable?.sessionId;
```

## Code Examples

### Complete 2.0 Example

```typescript
// agent/my-agent.ts
import { entrypoint, getConfig } from '@langchain/langgraph';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { z } from 'zod';
import { withLangGraph, MessagesZodMeta } from '@langchain/langgraph/zod';
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage } from 'langchain/schema';

const State = z.object({
    messages: withLangGraph(z.custom<BaseMessage[]>(), MessagesZodMeta),
});

const workflow = entrypoint('my-agent', async (state: z.infer<typeof State>) => {
    const config = getConfig();

    // Access context data
    const userId = config.configurable?.userId;
    const preferences = config.configurable?.preferences;

    const agent = createAgent({
        model: new ChatOpenAI({
            model: 'gpt-4',
            temperature: preferences?.temperature || 0.7,
        }),
        systemPrompt: `You are a helpful assistant${userId ? ` for user ${userId}` : ''}`,
        tools: [], // Add your tools here
    });

    return agent.invoke(state);
});

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
}).compile();
```

### Registration (No Change)

```typescript
// agent/index.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { graph } from './my-agent';

registerGraph('my-agent', graph);
```

## Testing Your Migration

1. Update all dependencies
2. Replace state definitions with Zod schemas
3. Convert StateGraph patterns to entrypoint patterns
4. Update agent creation calls
5. Test thoroughly in development environment
6. Verify context passing works correctly

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Ensure all dependencies are updated to compatible versions
2. **Type errors with state**: Update state definitions to use Zod schemas with `withLangGraph`
3. **Context not accessible**: Use `getConfig()` inside the entrypoint function
4. **Agent creation fails**: Replace `createReactAgent` with `createAgent` and update parameters

### Need Help?

-   Check the [API documentation](./api/index.md)
-   Review the [examples](./examples/)
-   Open an issue on [GitHub](https://github.com/KonghaYao/pure-graph/issues)
