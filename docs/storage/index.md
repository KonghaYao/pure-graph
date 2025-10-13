---
title: Storage Backends
---

# Storage Backends

Pure Graph supports multiple storage backends for persisting graph state, checkpoints, thread metadata, and message queues. Choose the right storage solution based on your application's needs for performance, reliability, and scalability.

## Quick Reference

| Storage                              | Performance        | Persistence   | Scalability      | Use Case            |
| ------------------------------------ | ------------------ | ------------- | ---------------- | ------------------- |
| [Memory](/docs/storage/memory)       | ⚡ Highest         | ❌ None       | 🧵 Single        | Development/Testing |
| [SQLite](/docs/storage/sqlite)       | 🚀 Fast            | 💾 File-based | 🖥️ Single-server | Small apps          |
| [PostgreSQL](/docs/storage/postgres) | 🏢 Enterprise      | 💾 ACID       | 🌐 Distributed   | Production          |
| [Redis](/docs/storage/redis)         | ⚡ Sub-millisecond | 💾 TTL-based  | 🔄 Distributed   | High-performance    |

## Storage Architecture

Pure Graph uses a layered storage approach where different components can use different storage backends:

```
┌─────────────────┐
│   Checkpoints   │ ← Graph state persistence
├─────────────────┤
│   Thread Data   │ ← Conversation metadata
├─────────────────┤
│ Message Queues  │ ← Streaming data
└─────────────────┘
```

Each layer can be configured independently based on your performance and reliability requirements.

## Configuration Priority

Pure Graph automatically selects storage backends based on environment variables with this priority:

1. **Redis** (if `REDIS_URL` set and `CHECKPOINT_TYPE` matches)
2. **PostgreSQL** (if `DATABASE_URL` set)
3. **SQLite** (if `SQLITE_DATABASE_URI` set)
4. **Memory** (fallback default)

## Choosing the Right Storage

### For Development & Testing

-   **Memory Storage**: Fastest setup, no persistence needed
-   **SQLite**: File-based persistence for local development

### For Production Applications

-   **PostgreSQL**: Enterprise-grade reliability and concurrent access
-   **Redis**: High-performance caching with TTL management

### For High-Performance Use Cases

-   **Redis**: Sub-millisecond response times, distributed caching
-   **PostgreSQL + Redis**: Combine durability with performance
