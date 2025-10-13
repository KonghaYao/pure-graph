---
title: Redis Storage
---

# Redis Storage

Redis primarily serves as a high-performance message broker for streaming data in Pure Graph. While Redis can also be used for checkpoints when needed, its main role is handling real-time pub/sub messaging for graph execution streams.

## Overview

Redis is used in Pure Graph mainly for **streaming data synchronization** through pub/sub messaging. It can optionally be used for checkpoint storage, but this is typically not recommended for production use due to data persistence concerns.

## Characteristics

-   📡 **Message Broker** - Primary role for streaming data
-   ⚡ **High performance** - Sub-millisecond pub/sub operations
-   🔄 **Pub/Sub messaging** - Real-time data synchronization
-   💾 **Optional checkpoint storage** - Available but not recommended for production

## Configuration

### Basic Configuration

```bash
# Redis connection for message queues (primary use)
REDIS_URL=redis://localhost:6379
```

### Optional Checkpoint Storage

Redis can be used for checkpoint storage (not recommended for production):

```bash
# Enable Redis checkpoints (optional)
REDIS_URL=redis://localhost:6379
CHECKPOINT_TYPE=redis
```

### Advanced Configuration

```bash
# Authentication
REDIS_URL=redis://username:password@localhost:6379

# TLS/SSL
REDIS_URL=rediss://username:password@secure-host:6380

# Connection pool
REDIS_MAX_CONNECTIONS=20
```

## Checkpoint Storage (Optional)

While Redis is primarily used for message queues, you can optionally use it for checkpoint storage:

```bash
CHECKPOINT_TYPE=redis  # Enable Redis checkpoints
```

**Note:** Redis checkpoints are not recommended for production due to data persistence limitations. Use PostgreSQL or other persistent storage for checkpoints in production.

## Pure Graph Redis Keys

When using Redis, Pure Graph stores data under these key patterns:

```
langgraph:queue:*          # Message queues (primary use)
langgraph:checkpoint:*     # Graph state checkpoints (optional)
langgraph:thread:*         # Thread metadata (optional)
```

## Security

### Authentication

```bash
# Enable password authentication
REDIS_URL=redis://username:your_password@localhost:6379
```

### TLS/SSL

```bash
# Use TLS for encrypted connections
REDIS_URL=rediss://username:password@secure-host:6380
```

## Performance Characteristics

| Metric        | Redis Performance         |
| ------------- | ------------------------- |
| Read Latency  | 0.1-1ms                   |
| Write Latency | 0.1-1ms                   |
| Throughput    | 100k-1M ops/sec           |
| Memory Usage  | Configurable (256MB-1TB+) |
| Persistence   | Optional (RDB/AOF)        |

## Use Cases

**Primary use in Pure Graph:**

-   **Message Queues** - Real-time streaming data for graph executions
-   **Pub/Sub messaging** - Synchronize data between graph components
-   **Real-time updates** - Stream execution results to clients

**Optional checkpoint storage:**

-   **Development/Testing** - Fast checkpoint access for debugging
-   **High-performance caching** - When persistence is not critical
-   **Temporary state** - Short-lived checkpoint data

**Note:** For production checkpoint storage, use PostgreSQL instead of Redis due to data persistence requirements.

### Performance Issues

```
Problem: Slow operations or high latency
Solutions:
1. Monitor Redis performance metrics
2. Check connection pool configuration
3. Optimize key access patterns
```

## Best Practices

-   **Use authentication** - Always configure passwords for Redis
-   **Enable TLS** - Use encrypted connections in production
-   **Monitor connections** - Track connection pool usage
-   **Set appropriate TTL** - Configure proper key expiration times
