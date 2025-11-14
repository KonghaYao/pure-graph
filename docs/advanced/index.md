---
title: Advanced Usage Guide
---

# Advanced Usage Guide

This guide covers advanced Open LangGraph Server features including context passing, custom graphs, middleware patterns, performance optimization, and enterprise deployment strategies.

## Context Passing and Injection

### Advanced Context Patterns

#### Dynamic Context with User Authentication

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

export async function authMiddleware(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await verifyJWT(token);

        // Inject comprehensive user context
        const langgraphContext = {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions,
            },
            session: {
                id: request.cookies.get('session-id')?.value,
                ip: request.ip || request.headers.get('x-forwarded-for'),
                userAgent: request.headers.get('user-agent'),
            },
            preferences: user.preferences || {},
            metadata: {
                source: 'web-app',
                timestamp: new Date().toISOString(),
                version: process.env.APP_VERSION,
            },
        };

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-langgraph-context', JSON.stringify(langgraphContext));

        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}
```

#### Context-Aware Graph with Personalized Responses

```typescript
// agent/personalized-assistant.ts
import { entrypoint, getConfig } from '@langchain/langgraph';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { ChatOpenAI } from '@langchain/openai';

const State = createState(createReactAgentAnnotation()).build({});

const workflow = entrypoint('personalized-assistant', async (state) => {
    const config = getConfig();

    // Extract user context
    const user = config.configurable?.user;
    const preferences = config.configurable?.preferences;
    const session = config.configurable?.session;

    // Build personalized system prompt
    const systemPrompt = buildPersonalizedPrompt(user, preferences);

    // Log context for debugging
    console.log('Processing request for user:', {
        userId: user?.id,
        role: user?.role,
        sessionId: session?.id,
    });

    const agent = createReactAgent({
        llm: new ChatOpenAI({
            model: preferences?.model || 'gpt-4',
            temperature: preferences?.temperature || 0.7,
        }),
        prompt: systemPrompt,
        tools: getUserTools(user?.permissions),
    });

    return agent.invoke(state);
});

function buildPersonalizedPrompt(user: any, preferences: any) {
    const basePrompt = 'You are a helpful AI assistant.';

    const customizations = [];

    if (user?.role === 'premium') {
        customizations.push('Provide detailed, comprehensive responses.');
    }

    if (preferences?.communication_style === 'formal') {
        customizations.push('Use formal language and professional tone.');
    }

    if (preferences?.expertise_areas?.length > 0) {
        customizations.push(`You have expertise in: ${preferences.expertise_areas.join(', ')}.`);
    }

    return [basePrompt, ...customizations].join(' ');
}

function getUserTools(permissions: string[]) {
    const tools = [];

    if (permissions?.includes('search')) {
        tools.push(new TavilySearchResults({}));
    }

    if (permissions?.includes('calculator')) {
        tools.push(new CalculatorTool());
    }

    return tools;
}

export const graph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
```

### Context Validation and Type Safety

```typescript
// types/context.ts
import { z } from 'zod';

export const UserContextSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(['free', 'premium', 'enterprise']),
    permissions: z.array(z.string()),
    preferences: z
        .object({
            model: z.string().optional(),
            temperature: z.number().min(0).max(2).optional(),
            communication_style: z.enum(['casual', 'formal']).optional(),
            expertise_areas: z.array(z.string()).optional(),
        })
        .optional(),
});

export const SessionContextSchema = z.object({
    id: z.string(),
    ip: z.string(),
    userAgent: z.string().optional(),
});

export const LangGraphContextSchema = z.object({
    user: UserContextSchema,
    session: SessionContextSchema,
    metadata: z.object({
        source: z.string(),
        timestamp: z.string(),
        version: z.string().optional(),
    }),
});

// types/index.ts
export type UserContext = z.infer<typeof UserContextSchema>;
export type SessionContext = z.infer<typeof SessionContextSchema>;
export type LangGraphContext = z.infer<typeof LangGraphContextSchema>;
```

```typescript
// middleware/context-validation.ts
import { NextRequest, NextResponse } from 'next/server';
import { LangGraphContextSchema } from '@/types/context';

export function validateContextMiddleware(request: NextRequest) {
    const contextHeader = request.headers.get('x-langgraph-context');

    if (!contextHeader) {
        return NextResponse.json({ error: 'Missing context' }, { status: 400 });
    }

    try {
        const context = JSON.parse(contextHeader);
        const validatedContext = LangGraphContextSchema.parse(context);

        // Add validated context back to headers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-langgraph-context', JSON.stringify(validatedContext));

        return NextResponse.next({
            request: { headers: requestHeaders },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid context format', details: error.errors }, { status: 400 });
    }
}
```

## Custom Graph Architectures

### Multi-Agent Orchestration

```typescript
// agent/multi-agent-orchestrator.ts
import { StateGraph, START, END } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// Define the state
const OrchestratorState = z.object({
    messages: z.array(z.any()),
    current_agent: z.string().optional(),
    task_analysis: z
        .object({
            complexity: z.enum(['simple', 'medium', 'complex']),
            required_skills: z.array(z.string()),
            estimated_time: z.number(),
        })
        .optional(),
    results: z.record(z.string(), z.any()),
});

// Create specialized agents
const agents = {
    researcher: createReactAgent({
        llm: new ChatOpenAI({ model: 'gpt-4' }),
        prompt: 'You are a research specialist. Provide comprehensive, factual information.',
        tools: [
            /* research tools */
        ],
    }),

    analyst: createReactAgent({
        llm: new ChatOpenAI({ model: 'gpt-4' }),
        prompt: 'You are a data analyst. Analyze information and provide insights.',
        tools: [
            /* analysis tools */
        ],
    }),

    writer: createReactAgent({
        llm: new ChatOpenAI({ model: 'gpt-4' }),
        prompt: 'You are a content writer. Create engaging, well-structured content.',
        tools: [
            /* writing tools */
        ],
    }),
};

// Orchestrator workflow
const workflow = new StateGraph(OrchestratorState)
    .addNode('analyze_task', async (state) => {
        // Analyze the incoming task
        const analysis = await analyzeTaskComplexity(state.messages);
        return {
            ...state,
            task_analysis: analysis,
        };
    })

    .addNode('route_to_agent', async (state) => {
        const { complexity, required_skills } = state.task_analysis!;

        let selectedAgent = 'researcher'; // default

        if (complexity === 'complex' || required_skills.includes('analysis')) {
            selectedAgent = 'analyst';
        } else if (required_skills.includes('writing')) {
            selectedAgent = 'writer';
        }

        return {
            ...state,
            current_agent: selectedAgent,
        };
    })

    .addNode('execute_with_agent', async (state) => {
        const agent = agents[state.current_agent as keyof typeof agents];
        const result = await agent.invoke(state);

        return {
            ...state,
            results: {
                ...state.results,
                [state.current_agent!]: result,
            },
        };
    })

    .addNode('synthesize_results', async (state) => {
        if (Object.keys(state.results).length === 1) {
            // Single agent result
            return state.results[Object.keys(state.results)[0]];
        }

        // Synthesize multiple results
        const synthesis = await synthesizeMultipleResults(state.results);
        return synthesis;
    })

    .addEdge(START, 'analyze_task')
    .addEdge('analyze_task', 'route_to_agent')
    .addEdge('route_to_agent', 'execute_with_agent')
    .addEdge('execute_with_agent', 'synthesize_results')
    .addEdge('synthesize_results', END);

async function analyzeTaskComplexity(messages: any[]) {
    // Implement task analysis logic
    const lastMessage = messages[messages.length - 1];

    // Simple heuristic-based analysis
    const complexity = lastMessage.content.length > 500 ? 'complex' : 'simple';
    const required_skills = [];

    if (lastMessage.content.includes('analyze') || lastMessage.content.includes('data')) {
        required_skills.push('analysis');
    }

    if (lastMessage.content.includes('write') || lastMessage.content.includes('create')) {
        required_skills.push('writing');
    }

    return {
        complexity,
        required_skills,
        estimated_time: complexity === 'complex' ? 300 : 60, // seconds
    };
}

async function synthesizeMultipleResults(results: Record<string, any>) {
    // Combine results from multiple agents
    const combinedContent = Object.entries(results)
        .map(([agent, result]) => `${agent.toUpperCase()}: ${result.content}`)
        .join('\n\n');

    return {
        content: `Synthesis of multiple expert analyses:\n\n${combinedContent}`,
        role: 'assistant',
    };
}

export const multiAgentGraph = workflow.compile();
```

### Event-Driven Graphs

```typescript
// agent/event-driven-graph.ts
import { StateGraph, START, END } from '@langchain/langgraph';
import { RunnableLambda } from '@langchain/core/runnables';
import { z } from 'zod';

// Event types
const EventSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('user_message'),
        content: z.string(),
        userId: z.string(),
    }),
    z.object({
        type: z.literal('system_alert'),
        severity: z.enum(['low', 'medium', 'high']),
        message: z.string(),
    }),
    z.object({
        type: z.literal('data_update'),
        table: z.string(),
        recordId: z.string(),
        changes: z.record(z.any()),
    }),
]);

// State with event queue
const EventDrivenState = z.object({
    events: z.array(EventSchema),
    processed_events: z.array(z.string()), // event IDs
    current_event: EventSchema.optional(),
    responses: z.array(z.any()),
    context: z.record(z.any()),
});

const eventDrivenWorkflow = new StateGraph(EventDrivenState)
    .addNode('event_router', async (state) => {
        if (state.events.length === 0) {
            return state; // No events to process
        }

        const event = state.events[0];
        const remainingEvents = state.events.slice(1);

        return {
            ...state,
            events: remainingEvents,
            current_event: event,
        };
    })

    .addNode('process_user_message', async (state) => {
        const event = state.current_event;
        if (event?.type !== 'user_message') return state;

        // Process user message
        const response = await handleUserMessage(event, state.context);

        return {
            ...state,
            responses: [...state.responses, response],
            processed_events: [...state.processed_events, generateEventId(event)],
        };
    })

    .addNode('process_system_alert', async (state) => {
        const event = state.current_event;
        if (event?.type !== 'system_alert') return state;

        // Process system alert
        const response = await handleSystemAlert(event, state.context);

        return {
            ...state,
            responses: [...state.responses, response],
            processed_events: [...state.processed_events, generateEventId(event)],
        };
    })

    .addNode('process_data_update', async (state) => {
        const event = state.current_event;
        if (event?.type !== 'data_update') return state;

        // Process data update
        const updatedContext = await handleDataUpdate(event, state.context);

        return {
            ...state,
            context: { ...state.context, ...updatedContext },
            processed_events: [...state.processed_events, generateEventId(event)],
        };
    })

    .addConditionalEdges('event_router', (state) => {
        const event = state.current_event;
        if (!event) return END;

        switch (event.type) {
            case 'user_message':
                return 'process_user_message';
            case 'system_alert':
                return 'process_system_alert';
            case 'data_update':
                return 'process_data_update';
            default:
                return 'event_router'; // Skip unknown events
        }
    })

    .addEdge('process_user_message', 'event_router')
    .addEdge('process_system_alert', 'event_router')
    .addEdge('process_data_update', 'event_router')
    .addEdge(START, 'event_router');

async function handleUserMessage(event: any, context: any) {
    // Implement user message handling
    return {
        type: 'response',
        content: `Processed message: ${event.content}`,
        userId: event.userId,
    };
}

async function handleSystemAlert(event: any, context: any) {
    // Implement alert handling based on severity
    const priority = event.severity === 'high' ? 'urgent' : 'normal';

    return {
        type: 'alert_acknowledgment',
        message: `Alert processed with ${priority} priority: ${event.message}`,
        severity: event.severity,
    };
}

async function handleDataUpdate(event: any, context: any) {
    // Update context based on data changes
    return {
        [event.table]: {
            ...context[event.table],
            [event.recordId]: {
                ...context[event.table]?.[event.recordId],
                ...event.changes,
                last_updated: new Date().toISOString(),
            },
        },
    };
}

function generateEventId(event: any): string {
    return `${event.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const eventDrivenGraph = eventDrivenWorkflow.compile();
```

## Middleware Patterns

### Request Interception and Modification

```typescript
// middleware/request-interceptor.ts
import { NextRequest, NextResponse } from 'next/server';

export class RequestInterceptor {
    private rules: InterceptRule[] = [];

    addRule(rule: InterceptRule) {
        this.rules.push(rule);
    }

    async intercept(request: NextRequest): Promise<NextResponse | null> {
        for (const rule of this.rules) {
            if (await rule.condition(request)) {
                return rule.handler(request);
            }
        }
        return null;
    }
}

interface InterceptRule {
    condition: (request: NextRequest) => Promise<boolean> | boolean;
    handler: (request: NextRequest) => Promise<NextResponse> | NextResponse;
}

// Usage
const interceptor = new RequestInterceptor();

// Rate limiting rule
interceptor.addRule({
    condition: (req) => req.nextUrl.pathname.startsWith('/api/langgraph'),
    handler: async (req) => {
        const clientId = getClientId(req);
        const isAllowed = await checkRateLimit(clientId);

        if (!isAllowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': '60',
                        'X-RateLimit-Reset': getResetTime(clientId),
                    },
                },
            );
        }

        return NextResponse.next();
    },
});

// Content filtering rule
interceptor.addRule({
    condition: (req) => req.method === 'POST' && req.nextUrl.pathname.includes('/runs'),
    handler: async (req) => {
        const body = await req.json();

        if (containsInappropriateContent(body.input)) {
            return NextResponse.json({ error: 'Content policy violation' }, { status: 400 });
        }

        // Reconstruct request with filtered body
        const newRequest = new NextRequest(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(body),
        });

        return NextResponse.next({
            request: newRequest,
        });
    },
});
```

### Response Transformation Middleware

```typescript
// middleware/response-transformer.ts
import { NextResponse } from 'next/server';

export class ResponseTransformer {
    private transformers: ResponseTransformerRule[] = [];

    addTransformer(transformer: ResponseTransformerRule) {
        this.transformers.push(transformer);
    }

    async transform(response: NextResponse, request: NextRequest): Promise<NextResponse> {
        let transformedResponse = response;

        for (const transformer of this.transformers) {
            if (await transformer.condition(request, transformedResponse)) {
                transformedResponse = await transformer.handler(transformedResponse, request);
            }
        }

        return transformedResponse;
    }
}

interface ResponseTransformerRule {
    condition: (request: NextRequest, response: NextResponse) => Promise<boolean> | boolean;
    handler: (response: NextResponse, request: NextRequest) => Promise<NextResponse> | NextResponse;
}

// Usage
const transformer = new ResponseTransformer();

// Add response metadata
transformer.addTransformer({
    condition: (req) => req.nextUrl.pathname.includes('/threads'),
    handler: async (res, req) => {
        const data = await res.json();

        const enhancedData = Array.isArray(data) ? data.map((item) => addMetadata(item, req)) : addMetadata(data, req);

        return NextResponse.json(enhancedData, {
            headers: res.headers,
        });
    },
});

// Compress responses for slow connections
transformer.addTransformer({
    condition: (req, res) => {
        const acceptEncoding = req.headers.get('accept-encoding') || '';
        return acceptEncoding.includes('gzip') && res.headers.get('content-length') > 1024;
    },
    handler: async (res) => {
        // Apply gzip compression
        const compressedBody = await gzip(await res.arrayBuffer());

        return new NextResponse(compressedBody, {
            status: res.status,
            statusText: res.statusText,
            headers: {
                ...res.headers,
                'content-encoding': 'gzip',
                'content-length': compressedBody.length.toString(),
            },
        });
    },
});

function addMetadata(item: any, request: NextRequest) {
    return {
        ...item,
        _metadata: {
            requested_at: new Date().toISOString(),
            requested_by: getClientId(request),
            api_version: 'v1',
        },
    };
}
```

## Performance Optimization

### Connection Pooling and Caching

```typescript
// config/database.ts
import { Pool } from 'pg';
import Redis from 'redis';

export const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_SIZE || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production',
});

export const redisClient = Redis.createClient({
    url: process.env.REDIS_URL,
    socket: {
        connectTimeout: 60000,
        lazyConnect: true,
    },
});

// Connection monitoring
dbPool.on('connect', (client) => {
    console.log('New database connection established');
});

dbPool.on('error', (err, client) => {
    console.error('Database pool error:', err);
});

redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down connections...');
    await dbPool.end();
    await redisClient.quit();
    process.exit(0);
});
```

### Query Optimization and Indexing

```sql
-- Optimized indexes for Open LangGraph Server
CREATE INDEX CONCURRENTLY idx_threads_user_status ON threads(user_id, status) WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_runs_thread_created ON runs(thread_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_checkpoints_thread_checkpoint ON checkpoints(thread_id, checkpoint_id);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY idx_active_threads ON threads(created_at) WHERE status NOT IN ('completed', 'failed');
CREATE INDEX CONCURRENTLY idx_recent_runs ON runs(created_at) WHERE created_at > NOW() - INTERVAL '30 days';

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_threads_metadata_gin ON threads USING GIN (metadata jsonb_ops);
CREATE INDEX CONCURRENTLY idx_runs_metadata_gin ON runs USING GIN (metadata jsonb_ops);
```

### Caching Strategies

```typescript
// lib/cache.ts
import { redisClient } from '@/config/database';

export class CacheManager {
    private prefix = 'puregraph:';

    async get(key: string): Promise<any | null> {
        try {
            const data = await redisClient.get(this.prefix + key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
        try {
            await redisClient.setEx(this.prefix + key, ttlSeconds, JSON.stringify(value));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    async invalidate(pattern: string): Promise<void> {
        try {
            const keys = await redisClient.keys(this.prefix + pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        } catch (error) {
            console.error('Cache invalidate error:', error);
        }
    }

    // Cache thread data
    async getThread(threadId: string) {
        return this.get(`thread:${threadId}`);
    }

    async setThread(threadId: string, data: any) {
        await this.set(`thread:${threadId}`, data, 600); // 10 minutes
    }

    // Cache assistant metadata
    async getAssistant(assistantId: string) {
        return this.get(`assistant:${assistantId}`);
    }

    async setAssistant(assistantId: string, data: any) {
        await this.set(`assistant:${assistantId}`, data, 3600); // 1 hour
    }

    // Invalidate user caches
    async invalidateUserCaches(userId: string) {
        await this.invalidate(`thread:user:${userId}:*`);
        await this.invalidate(`run:user:${userId}:*`);
    }
}

export const cacheManager = new CacheManager();
```

### Streaming Optimization

```typescript
// lib/streaming.ts
import { EventEmitter } from 'events';

export class OptimizedStreamManager extends EventEmitter {
    private streams = new Map<string, StreamSession>();
    private compressionThreshold = 1024; // 1KB

    createStream(sessionId: string, options: StreamOptions = {}): StreamSession {
        const session = new StreamSession(sessionId, {
            compress: options.compress ?? true,
            bufferSize: options.bufferSize ?? 8192,
            heartbeatInterval: options.heartbeatInterval ?? 30000,
        });

        this.streams.set(sessionId, session);

        // Auto-cleanup on end
        session.on('end', () => {
            setTimeout(() => this.streams.delete(sessionId), 5000);
        });

        return session;
    }

    getStream(sessionId: string): StreamSession | undefined {
        return this.streams.get(sessionId);
    }

    broadcast(event: string, data: any, filter?: (session: StreamSession) => boolean) {
        for (const session of this.streams.values()) {
            if (!filter || filter(session)) {
                session.send(event, data);
            }
        }
    }

    getStats() {
        return {
            activeStreams: this.streams.size,
            totalStreams: Array.from(this.streams.values()).reduce((sum, s) => sum + s.messageCount, 0),
        };
    }
}

class StreamSession extends EventEmitter {
    public messageCount = 0;
    private buffer: string[] = [];
    private heartbeatTimer?: NodeJS.Timeout;

    constructor(
        public sessionId: string,
        private options: {
            compress: boolean;
            bufferSize: number;
            heartbeatInterval: number;
        },
    ) {
        super();
        this.startHeartbeat();
    }

    send(event: string, data: any) {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        if (this.options.compress && message.length > this.options.bufferSize) {
            // Compress large messages
            this.buffer.push(this.compress(message));
        } else {
            this.buffer.push(message);
        }

        this.messageCount++;

        // Auto-flush when buffer is full
        if (this.buffer.length >= 10) {
            this.flush();
        }
    }

    flush(): string[] {
        const messages = [...this.buffer];
        this.buffer = [];
        return messages;
    }

    end() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        this.emit('end');
    }

    private startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.send('heartbeat', { timestamp: Date.now() });
        }, this.options.heartbeatInterval);
    }

    private compress(data: string): string {
        // Implement compression logic (gzip, brotli, etc.)
        return data; // Placeholder
    }
}

interface StreamOptions {
    compress?: boolean;
    bufferSize?: number;
    heartbeatInterval?: number;
}
```

## Enterprise Deployment

### Multi-Region Deployment

```typescript
// config/regions.ts
export const regions = {
    'us-east-1': {
        database: process.env.US_EAST_DATABASE_URL,
        redis: process.env.US_EAST_REDIS_URL,
        readReplicas: [process.env.US_EAST_REPLICA1_URL, process.env.US_EAST_REPLICA2_URL],
    },
    'eu-west-1': {
        database: process.env.EU_WEST_DATABASE_URL,
        redis: process.env.EU_WEST_REDIS_URL,
        readReplicas: [process.env.EU_WEST_REPLICA1_URL],
    },
    'ap-southeast-1': {
        database: process.env.AP_SOUTHEAST_DATABASE_URL,
        redis: process.env.AP_SOUTHEAST_REDIS_URL,
        readReplicas: [],
    },
};

export function getRegionConfig(region: string) {
    return regions[region as keyof typeof regions] || regions['us-east-1'];
}

export function getNearestRegion(clientIp: string): string {
    // Implement IP-based region detection
    // This is a simplified version
    if (clientIp.startsWith('192.168.') || clientIp.startsWith('10.')) {
        return 'us-east-1'; // Local development
    }

    // Use a geolocation service or CDN headers
    return 'us-east-1'; // Default fallback
}
```

### Load Balancing and Failover

```typescript
// lib/load-balancer.ts
export class LoadBalancer {
    private backends: Backend[] = [];
    private healthCheckInterval: NodeJS.Timeout;

    constructor(backends: Backend[]) {
        this.backends = backends.map((b) => ({ ...b, healthy: true, load: 0 }));
        this.startHealthChecks();
    }

    getBackend(clientId?: string): Backend | null {
        const healthyBackends = this.backends.filter((b) => b.healthy);

        if (healthyBackends.length === 0) {
            return null; // No healthy backends
        }

        if (clientId) {
            // Sticky sessions for stateful operations
            const hash = this.hashString(clientId);
            return healthyBackends[hash % healthyBackends.length];
        }

        // Least loaded backend
        return healthyBackends.reduce((min, curr) => (curr.load < min.load ? curr : min));
    }

    reportLoad(backendId: string, load: number) {
        const backend = this.backends.find((b) => b.id === backendId);
        if (backend) {
            backend.load = load;
        }
    }

    private startHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            for (const backend of this.backends) {
                try {
                    const isHealthy = await this.checkHealth(backend);
                    backend.healthy = isHealthy;

                    if (!isHealthy) {
                        console.warn(`Backend ${backend.id} is unhealthy`);
                    }
                } catch (error) {
                    console.error(`Health check failed for ${backend.id}:`, error);
                    backend.healthy = false;
                }
            }
        }, 30000); // Check every 30 seconds
    }

    private async checkHealth(backend: Backend): Promise<boolean> {
        try {
            const response = await fetch(`${backend.url}/health`, {
                timeout: 5000,
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    destroy() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
    }
}

interface Backend {
    id: string;
    url: string;
    region: string;
    healthy: boolean;
    load: number;
}
```

### Monitoring and Observability

```typescript
// lib/monitoring.ts
import { EventEmitter } from 'events';

export class MonitoringSystem extends EventEmitter {
    private metrics: Map<string, Metric> = new Map();

    recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
        const key = `${name}:${JSON.stringify(tags)}`;

        if (!this.metrics.has(key)) {
            this.metrics.set(key, {
                name,
                value,
                tags,
                timestamp: Date.now(),
                count: 1,
            });
        } else {
            const metric = this.metrics.get(key)!;
            metric.value = (metric.value + value) / 2; // Running average
            metric.count++;
            metric.timestamp = Date.now();
        }

        this.emit('metric', { name, value, tags });
    }

    recordRequest(method: string, path: string, duration: number, status: number) {
        this.recordMetric('http_request_duration', duration, {
            method,
            path: path.replace(/\d+/g, ':id'), // Anonymize IDs
            status: status.toString(),
        });

        this.recordMetric('http_requests_total', 1, {
            method,
            path: path.replace(/\d+/g, ':id'),
            status: status.toString(),
        });
    }

    recordGraphExecution(graphId: string, duration: number, success: boolean) {
        this.recordMetric('graph_execution_duration', duration, {
            graph_id: graphId,
            success: success.toString(),
        });

        this.recordMetric('graph_executions_total', 1, {
            graph_id: graphId,
            success: success.toString(),
        });
    }

    recordStreamingSession(duration: number, messageCount: number) {
        this.recordMetric('streaming_session_duration', duration, {});
        this.recordMetric('streaming_messages_total', messageCount, {});
    }

    getMetrics(): Metric[] {
        return Array.from(this.metrics.values());
    }

    exportMetrics(): string {
        const lines = [];

        for (const metric of this.metrics.values()) {
            const tags = Object.entries(metric.tags)
                .map(([k, v]) => `${k}="${v}"`)
                .join(',');

            lines.push(`# HELP ${metric.name} ${metric.name.replace(/_/g, ' ')}`);
            lines.push(`# TYPE ${metric.name} gauge`);
            lines.push(`${metric.name}{${tags}} ${metric.value} ${metric.timestamp}`);
        }

        return lines.join('\n');
    }
}

interface Metric {
    name: string;
    value: number;
    tags: Record<string, string>;
    timestamp: number;
    count: number;
}

// Middleware integration
export function monitoringMiddleware(monitor: MonitoringSystem) {
    return async (c: Context, next: Next) => {
        const start = Date.now();

        await next();

        const duration = Date.now() - start;
        monitor.recordRequest(c.req.method, c.req.path, duration, c.res.status);
    };
}
```

This advanced usage guide covers sophisticated patterns for building production-ready applications with Open LangGraph Server. Each pattern includes practical examples and best practices for scalability, reliability, and maintainability.
