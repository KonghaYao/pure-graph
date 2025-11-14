---
title: PostgreSQL Storage
---

# PostgreSQL Storage

PostgreSQL offers enterprise-grade reliability, concurrent access, and scalability. It's the recommended choice for production applications requiring high availability and performance.

## Overview

PostgreSQL is a powerful, open-source object-relational database system known for its robustness, extensibility, and standards compliance. Open LangGraph Server uses PostgreSQL for enterprise-grade data persistence.

## Characteristics

-   🏢 **Enterprise-grade** - Full ACID compliance and reliability
-   🔄 **Concurrent access** - Multiple simultaneous connections
-   📈 **Scalable** - Handles high-throughput applications
-   🌐 **Distributed** - Supports clustering and replication

## Configuration

```bash
# Connection string
DATABASE_URL=postgresql://username:password@localhost:5432/langgraph_db

# Enable initialization (only on first run)
DATABASE_INIT=true

# Optional: Connection pool settings
DATABASE_POOL_SIZE=10
DATABASE_SSL=true
```

## Setup

### Prerequisites

You need to have a PostgreSQL database ready. Open LangGraph Server will automatically create the required tables when you first run your application.

### Configuration

```bash
# Connection string to your PostgreSQL database
DATABASE_URL=postgresql://username:password@localhost:5432/your_database

# Enable initialization (only on first run)
DATABASE_INIT=true
```

### Initialize Schema

Open LangGraph Server automatically creates the required tables on first run:

```bash
# Set DATABASE_INIT=true for initial setup
export DATABASE_INIT=true

# Run your application once to create tables
npm run dev

# Remove the init flag for subsequent runs
unset DATABASE_INIT
```

## Schema Details

### Core Tables

**checkpoints**

```sql
CREATE TABLE checkpoints (
    thread_id TEXT PRIMARY KEY,
    checkpoint_ns TEXT,
    checkpoint_id TEXT,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint BYTEA,
    metadata BYTEA
);
```

**threads**

```sql
CREATE TABLE threads (
    thread_id TEXT PRIMARY KEY,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);
```

**checkpoint_writes**

```sql
CREATE TABLE checkpoint_writes (
    thread_id TEXT,
    checkpoint_ns TEXT,
    checkpoint_id TEXT,
    task_id TEXT,
    idx INTEGER,
    channel TEXT,
    type TEXT,
    value BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
```

## Connection Pooling

Open LangGraph Server automatically handles connection pooling. You can customize it:

```typescript
// Custom pool configuration (if needed)
process.env.DATABASE_POOL_SIZE = '20';
process.env.DATABASE_SSL = 'true';
process.env.DATABASE_MAX_IDLE_TIME = '30000';
```

### Pool Configuration Options

-   `DATABASE_POOL_SIZE`: Maximum number of connections (default: 10)
-   `DATABASE_SSL`: Enable SSL connections (default: false)
-   `DATABASE_MAX_IDLE_TIME`: Maximum idle time in ms (default: 30000)
-   `DATABASE_MAX_LIFETIME`: Maximum connection lifetime in ms

## Performance Characteristics

| Metric                 | PostgreSQL Performance         |
| ---------------------- | ------------------------------ |
| Read Latency           | 1-10ms                         |
| Write Latency          | 5-50ms                         |
| Concurrent Connections | 100-1000+                      |
| Max Database Size      | Unlimited (practical: 100s TB) |
| Memory Usage           | 256MB - 64GB+                  |

## Use Cases

**Perfect for:**

-   **Production applications** - Enterprise-grade reliability
-   **High-traffic websites** - Handles thousands of concurrent users
-   **Multi-tenant platforms** - Strong isolation and security
-   **Enterprise applications** - Advanced features and compliance

## Best Practices

-   **Use connection pooling** - Configure appropriate pool size for your workload
-   **Enable SSL** - Use `DATABASE_SSL=true` for encrypted connections
-   **Regular backups** - Implement automated backup strategies
-   **Monitor performance** - Track database metrics and query performance
