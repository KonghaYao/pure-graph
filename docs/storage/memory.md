---
title: Memory Storage
---

# Memory Storage

Memory storage is the default fallback option for Pure Graph, providing fast in-memory persistence with no external dependencies. It's ideal for development, testing, and stateless applications.

## Overview

Memory storage stores all data in the application's memory space. It's the fastest option available but provides no persistence across application restarts.

## Characteristics

-   ⚡ **Fastest performance** - No I/O operations
-   🔄 **No persistence** - Data lost on restart
-   🧵 **Single process** - Not shared between instances
-   🧪 **Development focused** - Perfect for testing and prototyping

## Configuration

```bash
# No configuration needed - this is the default
```

When no other storage backends are configured, Pure Graph automatically uses memory storage.

## Use Cases

**Perfect for:**

-   **Development environments** - Rapid iteration without database setup
-   **Unit testing** - Isolated, fast test execution
-   **Stateless applications** - No need for data persistence
-   **Prototyping and experimentation** - Quick proof-of-concepts

## Architecture

Memory storage uses JavaScript Maps and Sets to store data in memory:

```typescript
// Simplified internal structure
const memoryStore = {
    checkpoints: new Map<string, Checkpoint>(),
    threads: new Map<string, Thread>(),
    queues: new Map<string, Queue>(),
};
```

## Performance

**Advantages:**

-   Sub-millisecond read/write operations
-   Zero serialization overhead
-   No network latency
-   Unlimited concurrency within a single process

**Metrics:**

-   **Latency**: < 0.1ms
-   **Throughput**: Unlimited (limited by available RAM)
-   **Memory usage**: ~50-200MB depending on data volume

## Limitations

### Data Loss

-   All data is lost when the application restarts
-   No backup or recovery options
-   Not suitable for production use

### Scalability

-   Cannot scale horizontally across multiple processes
-   Data not shared between application instances
-   Single point of failure

### Resource Constraints

-   Limited by available system memory
-   No automatic cleanup or TTL management
-   Memory leaks possible if not properly managed

## Development Usage

### Quick Start

```typescript
// No configuration needed - memory storage is default
import { registerGraph } from '@langgraph-js/pure-graph';

registerGraph('my-graph', myLangGraph);
// Application automatically uses memory storage
```

### Testing

```typescript
// Example test setup
describe('My Graph', () => {
    it('should process messages', async () => {
        // Memory storage provides clean slate for each test
        const client = new LangGraphClient();

        const thread = await client.createThread();
        const result = await client.run(thread.id, 'my-graph', {
            messages: [{ role: 'user', content: 'Hello' }],
        });

        expect(result).toBeDefined();
    });
});
```

## Migration

When you're ready to add persistence, simply configure another storage backend:

```bash
# Switch to SQLite
echo "SQLITE_DATABASE_URI=./.langgraph_api/chat.db" >> .env

# Or PostgreSQL
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/db" >> .env

# Or Redis
echo "REDIS_URL=redis://localhost:6379" >> .env
echo "CHECKPOINT_TYPE=redis" >> .env
```

Pure Graph will automatically switch to the new storage backend without code changes.

## Monitoring

Since memory storage has no external dependencies, monitoring focuses on:

-   **Memory usage** - Monitor process memory consumption
-   **Data volume** - Track number of active threads/checkpoints
-   **Restart frequency** - Monitor how often the application restarts

```typescript
// Example monitoring
const stats = {
    threadCount: memoryThreads.size,
    checkpointCount: memoryCheckpoints.size,
    memoryUsage: process.memoryUsage(),
};
```

## Best Practices

### Development

-   Use memory storage for rapid development cycles
-   Combine with hot reloading for instant feedback
-   Use separate instances for different developers

### Testing

-   Leverage memory storage for fast, isolated tests
-   Each test gets a clean slate automatically
-   No need for test database setup/teardown

### Production Considerations

-   **Never use in production** - Data loss on restart
-   Use only for development and testing
-   Plan migration path to persistent storage early

## Troubleshooting

### High Memory Usage

```
Problem: Application uses too much memory
Solution: Monitor data volume, implement cleanup, consider switching to persistent storage
```

### Data Loss Issues

```
Problem: Data disappears on restart
Solution: This is expected behavior - switch to persistent storage for data retention
```

### Performance Issues

```
Problem: Slow operations despite memory storage
Solution: Check for memory pressure, optimize data structures, monitor garbage collection
```
