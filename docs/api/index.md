---
title: API Reference
---

# API Reference

Open LangGraph Server provides a comprehensive REST API that follows the LangGraph SDK specification. This reference covers all available endpoints, request/response formats, and usage examples.

## Base URL

All API endpoints are relative to your configured base path:

-   **Next.js**: `/api/langgraph/`
-   **Hono.js**: `/api/langgraph/` (configurable)

## Authentication

Open LangGraph Server relies on your framework's authentication mechanisms. Context can be injected via:

-   **Next.js**: `x-langgraph-context` header (set by middleware)
-   **Hono.js**: `langgraph_context` variable (set by middleware)

## Content Types

-   **Request**: `application/json`
-   **Response**: `application/json` (except streaming endpoints)

## Error Responses

All errors follow this format:

```json
{
    "error": {
        "message": "Human-readable error message",
        "code": "ERROR_CODE",
        "details": {} // Optional additional error information
    }
}
```

### Common HTTP Status Codes

-   `200` - Success
-   `201` - Created
-   `400` - Bad Request (validation error)
-   `401` - Unauthorized
-   `403` - Forbidden
-   `404` - Not Found
-   `409` - Conflict
-   `422` - Unprocessable Entity
-   `500` - Internal Server Error

## Assistants API

Manage and query available graph assistants.

### GET /assistants

Search for assistants with optional filtering.

**Parameters:**

-   `graph_id` (string, optional) - Filter by graph ID
-   `metadata` (object, optional) - Filter by metadata key-value pairs
-   `limit` (number, optional) - Maximum number of results (default: 10)
-   `offset` (number, optional) - Pagination offset (default: 0)
-   `sort_by` (string, optional) - Sort field: `assistant_id`, `graph_id`, `name`, `created_at`, `updated_at`
-   `sort_order` (string, optional) - Sort order: `asc`, `desc`

**Response:**

```json
[
    {
        "assistant_id": "my-assistant",
        "graph_id": "my-graph",
        "name": "My Assistant",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "metadata": {
            "description": "A helpful assistant",
            "version": "1.0.0"
        }
    }
]
```

**Example:**

```bash
curl "http://localhost:3000/api/assistants?limit=5&sort_by=created_at&sort_order=desc"
```

### GET /assistants/{assistantId}

Retrieve detailed information about a specific assistant.

**Parameters:**

-   `assistantId` (string, required) - The assistant ID
-   `xray` (boolean or number, optional) - Include graph structure (true) or depth limit

**Response:**

```json
{
  "assistant_id": "my-assistant",
  "graph_id": "my-graph",
  "name": "My Assistant",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "metadata": {},
  "graph": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/assistants/my-assistant?xray=true"
```

## Threads API

Manage conversation threads and their lifecycle.

### POST /threads

Create a new conversation thread.

**Request Body:**

```json
{
  "metadata": {
    "title": "My Conversation",
    "tags": ["general"],
    "custom_field": "value"
  },
  "thread_id": "optional-custom-id",
  "if_exists": "create" | "reject",
  "graph_id": "optional-graph-id"
}
```

**Parameters:**

-   `metadata` (object, optional) - Thread metadata
-   `thread_id` (string, optional) - Custom thread ID (auto-generated if not provided)
-   `if_exists` (string, optional) - Behavior if thread_id exists: `create`, `reject`
-   `graph_id` (string, optional) - Associate with specific graph

**Response (201):**

```json
{
    "thread_id": "thread_1234567890",
    "status": "idle",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "metadata": {
        "title": "My Conversation",
        "tags": ["general"]
    }
}
```

**Example:**

```bash
curl -X POST "http://localhost:3000/api/threads" \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"title": "New Chat"}}'
```

### GET /threads

Search and list threads with filtering and pagination.

**Parameters:**

-   `metadata` (object, optional) - Filter by metadata key-value pairs
-   `limit` (number, optional) - Maximum results (default: 10)
-   `offset` (number, optional) - Pagination offset (default: 0)
-   `status` (string, optional) - Filter by status: `idle`, `busy`, `error`, `stopped`
-   `sort_by` (string, optional) - Sort field: `thread_id`, `status`, `created_at`, `updated_at`
-   `sort_order` (string, optional) - Sort order: `asc`, `desc`

**Response:**

```json
[
    {
        "thread_id": "thread_1234567890",
        "status": "idle",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "metadata": {
            "title": "My Conversation"
        }
    }
]
```

**Example:**

```bash
curl "http://localhost:3000/api/threads?status=idle&limit=20&sort_by=updated_at&sort_order=desc"
```

### GET /threads/{threadId}

Retrieve detailed information about a specific thread.

**Parameters:**

-   `threadId` (string, required) - The thread ID

**Response:**

```json
{
    "thread_id": "thread_1234567890",
    "status": "idle",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "metadata": {
        "title": "My Conversation",
        "message_count": 5
    },
    "values": {
        // Current thread state/values
    }
}
```

**Example:**

```bash
curl "http://localhost:3000/api/threads/thread_1234567890"
```

### DELETE /threads/{threadId}

Delete a thread and all associated data.

**Parameters:**

-   `threadId` (string, required) - The thread ID to delete

**Response (200):**

```json
{
    "thread_id": "thread_1234567890",
    "deleted": true
}
```

**Example:**

```bash
curl -X DELETE "http://localhost:3000/api/threads/thread_1234567890"
```

## Runs API

Execute and manage graph runs within threads.

### GET /threads/{threadId}/runs

List runs for a specific thread.

**Parameters:**

-   `threadId` (string, required) - The thread ID
-   `limit` (number, optional) - Maximum results (default: 10)
-   `offset` (number, optional) - Pagination offset (default: 0)
-   `status` (string, optional) - Filter by run status

**Response:**

```json
[
    {
        "run_id": "run_1234567890",
        "thread_id": "thread_1234567890",
        "assistant_id": "my-assistant",
        "status": "success",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "completed_at": "2024-01-01T00:00:05Z"
    }
]
```

**Example:**

```bash
curl "http://localhost:3000/api/threads/thread_1234567890/runs?status=success"
```

### POST /threads/{threadId}/runs

Create and execute a new run.

**Parameters:**

-   `threadId` (string, required) - The thread ID

**Request Body:**

```json
{
    "assistant_id": "my-assistant",
    "input": {
        "messages": [
            {
                "role": "user",
                "content": "Hello, assistant!"
            }
        ]
    },
    "metadata": {
        "run_type": "chat",
        "priority": "normal"
    },
    "config": {
        "configurable": {
            "custom_setting": "value"
        }
    },
    "checkpoint_id": "optional-checkpoint-id",
    "checkpoint": {
        // Optional checkpoint data
    },
    "checkpoint_during": true,
    "interrupt_before": ["node_name"],
    "interrupt_after": ["node_name"],
    "multitask_strategy": "reject",
    "on_completion": "complete",
    "signal": null,
    "webhook": "https://example.com/webhook",
    "on_disconnect": "cancel",
    "after_seconds": 300,
    "if_not_exists": "create",
    "command": {
        "type": "update",
        "data": {}
    },
    "stream_mode": ["messages", "values"],
    "stream_subgraphs": true,
    "stream_resumable": true,
    "feedback_keys": ["rating"],
    "temporary": false
}
```

**Response (201):**

```json
{
    "run_id": "run_1234567890",
    "thread_id": "thread_1234567890",
    "assistant_id": "my-assistant",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
}
```

**Example:**

```bash
curl -X POST "http://localhost:3000/api/threads/thread_1234567890/runs" \
  -H "Content-Type: application/json" \
  -d '{
    "assistant_id": "my-assistant",
    "input": {
      "messages": [{"role": "user", "content": "Hello!"}]
    },
    "stream_mode": ["messages"]
  }'
```

### DELETE /threads/{threadId}/runs/{runId}

Cancel a running execution.

**Parameters:**

-   `threadId` (string, required) - The thread ID
-   `runId` (string, required) - The run ID to cancel
-   `wait` (boolean, optional) - Wait for cancellation to complete
-   `action` (string, optional) - Cancellation action: `interrupt`, `rollback`

**Response (200):**

```json
{
    "run_id": "run_1234567890",
    "cancelled": true,
    "status": "interrupted"
}
```

**Example:**

```bash
curl -X DELETE "http://localhost:3000/api/threads/thread_1234567890/runs/run_1234567890?wait=true"
```

### GET /threads/{threadId}/runs/{runId}/stream

Stream run results in real-time using Server-Sent Events.

**Parameters:**

-   `threadId` (string, required) - The thread ID
-   `runId` (string, required) - The run ID
-   `signal` (AbortSignal, optional) - Cancellation signal
-   `cancelOnDisconnect` (boolean, optional) - Cancel run on client disconnect
-   `lastEventId` (string, optional) - Resume from specific event ID
-   `streamMode` (string|string[], optional) - Override stream mode

**Response:** Server-Sent Events stream

**Event Types:**

-   `messages` - New messages from the graph
-   `values` - State value updates
-   `events` - General graph events
-   `error` - Error events
-   `end` - Stream completion

**Example:**

```javascript
const eventSource = new EventSource('http://localhost:3000/api/threads/thread_1234567890/runs/run_1234567890/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Event:', data.event, data.data);
};

eventSource.onerror = (error) => {
    console.error('Stream error:', error);
};
```

**Stream Event Format:**

```json
{
    "event": "messages",
    "data": {
        "content": "Hello! How can I help you?",
        "role": "assistant",
        "id": "msg_123"
    },
    "metadata": {
        "run_id": "run_1234567890",
        "thread_id": "thread_1234567890"
    }
}
```

## Streaming Configuration

### Stream Modes

Control what data is streamed during execution:

-   `messages` - Stream message updates
-   `values` - Stream state value changes
-   `events` - Stream all graph events
-   `debug` - Stream debug information

**Example:**

```json
{
    "stream_mode": ["messages", "values"]
}
```

### Stream Options

Additional streaming configuration:

```json
{
    "stream_subgraphs": true, // Include subgraph events
    "stream_resumable": true, // Allow stream resumption
    "feedback_keys": ["rating"] // Include feedback data
}
```

## Context and Configuration

### Context Injection

Context data is injected via framework middleware and made available to graphs through `getConfig().configurable`.

**Next.js Middleware Example:**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
    const context = {
        userId: 'user123',
        sessionId: 'session456',
        preferences: { theme: 'dark' },
    };

    request.headers.set('x-langgraph-context', JSON.stringify(context));
}
```

**Hono.js Middleware Example:**

```typescript
app.use('/api/langgraph/*', async (c, next) => {
    c.set('langgraph_context', {
        userId: 'user123',
        sessionId: 'session456',
        preferences: { theme: 'dark' },
    });
    await next();
});
```

### Run Configuration

Override default behavior per run:

```json
{
    "config": {
        "configurable": {
            "temperature": 0.7,
            "model": "gpt-4",
            "custom_setting": "value"
        }
    },
    "multitask_strategy": "interrupt",
    "on_completion": "continue"
}
```

## Error Handling

### Validation Errors

Invalid requests return detailed validation information:

```json
{
    "error": {
        "message": "Validation failed",
        "code": "VALIDATION_ERROR",
        "details": {
            "field": "assistant_id",
            "reason": "required"
        }
    }
}
```

### Graph Execution Errors

Graph execution failures include error details:

```json
{
    "error": {
        "message": "Graph execution failed",
        "code": "GRAPH_EXECUTION_ERROR",
        "details": {
            "node": "agent_node",
            "error": "API rate limit exceeded"
        }
    }
}
```

### Streaming Errors

Stream errors are sent as events:

```json
{
    "event": "error",
    "data": {
        "message": "Execution failed",
        "code": "EXECUTION_ERROR",
        "details": {}
    }
}
```

## Rate Limiting

Implement rate limiting at the framework level:

**Next.js Example:**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
    // Implement rate limiting logic
    const isAllowed = checkRateLimit(request);
    if (!isAllowed) {
        return NextResponse.json({ error: { message: 'Rate limit exceeded' } }, { status: 429 });
    }
}
```

## SDK Compatibility

Open LangGraph Server maintains compatibility with the LangGraph SDK, supporting all standard operations while adding framework-specific enhancements.

### LangGraph SDK Features Supported

-   ✅ Thread management
-   ✅ Run execution and streaming
-   ✅ Checkpoint persistence
-   ✅ Assistant discovery
-   ✅ Context passing
-   ✅ Error handling
-   ✅ Type safety

### Additional Open LangGraph Server Features

-   🔧 **Framework Integration** - Native Next.js and Hono.js support
-   💾 **Multiple Storage Backends** - SQLite, PostgreSQL, Redis, Memory
-   📊 **Message Queues** - Redis-based streaming queues
-   🏷️ **Context Injection** - Framework-specific context passing
-   🎯 **Type Validation** - Runtime type checking with Zod
