---
title: SQLite Storage
---

# SQLite Storage

SQLite provides file-based persistence with ACID compliance, making it perfect for development, testing, and small-scale applications. However, it's not recommended for production use due to concurrency limitations.

## Overview

SQLite is a self-contained, file-based database that doesn't require a separate server process. Pure Graph uses SQLite as the default persistent storage when no other databases are configured.

## Characteristics

-   📁 **File-based** - Simple setup with no server required
-   ⚖️ **ACID compliant** - Reliable transactions
-   🚀 **Good performance** - Fast for moderate workloads
-   🔒 **Single-writer** - Best for single-instance deployments

## Configuration

```bash
SQLITE_DATABASE_URI=./.langgraph_api/chat.db
```

## Setup

### Basic Setup

```bash
# Create the database directory
mkdir -p .langgraph_api

# The database file will be created automatically on first run
# You can also pre-create it with proper permissions
touch ./.langgraph_api/chat.db
```

### Directory Structure

```
.langgraph_api/
├── chat.db              # Main database file
├── chat.db-shm          # Shared memory file (SQLite WAL mode)
└── chat.db-wal          # Write-ahead log file (SQLite WAL mode)
```

## Schema

Pure Graph automatically creates the following tables:

-   `checkpoints` - Graph state persistence
-   `checkpoint_writes` - Checkpoint write operations
-   `threads` - Thread metadata and status

## Use Cases

**Perfect for:**

-   **Development environments** - Easy setup without external dependencies
-   **Automated testing** - Fast, isolated test execution
-   **Prototyping and demos** - Quick proof-of-concepts
-   **Small personal projects** - Simple file-based persistence
-   **Learning and experimentation** - Understanding LangGraph without complex setup

**Not recommended for:**

-   **Production applications** - Single-writer limitation affects concurrency
-   **Multi-server deployments** - Cannot share data across instances
-   **High-traffic applications** - Performance degrades under heavy load
-   **Enterprise environments** - Lacks advanced features like replication

## Backup Strategy

### Simple Backup Script

```bash
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/chat_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"
cp ./.langgraph_api/chat.db "$BACKUP_FILE"

# Optional: Compress backup
gzip "$BACKUP_FILE"
```

### Automated Backups

```bash
# Add to crontab for daily backups
0 2 * * * /path/to/backup-script.sh
```

## Performance Characteristics

| Metric                 | SQLite Performance          |
| ---------------------- | --------------------------- |
| Read Latency           | 0.1-1ms                     |
| Write Latency          | 1-5ms                       |
| Concurrent Connections | 1 writer + multiple readers |
| Max Database Size      | 281 TB (theoretical)        |
| Memory Usage           | 256KB - 2GB (configurable)  |

## Limitations

### Concurrency

-   **Single writer limitation** - Only one write operation at a time
-   **WAL mode helps** - Allows concurrent reads during writes
-   **Not suitable for high-write workloads**

### Scalability

-   **Single file** - Cannot distribute across multiple servers
-   **File system limits** - Subject to OS file system constraints
-   **Network storage** - Not recommended for network-mounted storage

### Recovery Procedures

#### WAL Recovery

```bash
# Force WAL checkpoint
sqlite3 .langgraph_api/chat.db "PRAGMA wal_checkpoint(TRUNCATE);"

# Check WAL file
ls -la .langgraph_api/chat.db*
```

#### Database Repair

```bash
# Create backup first
cp .langgraph_api/chat.db .langgraph_api/chat.db.backup

# Attempt repair
sqlite3 .langgraph_api/chat.db ".recover" > recovered.sql
sqlite3 recovered.db < recovered.sql
```

## Best Practices

### Development

-   Use SQLite for local development and prototyping
-   Enable WAL mode for better concurrency during development
-   Set appropriate cache size for your development workload
-   Use separate database files for different environments

### Testing

-   Perfect for unit tests and integration tests
-   Each test can use a fresh database file
-   Fast setup and teardown
-   No external dependencies required

### When to Switch

SQLite is great for development, but consider switching to PostgreSQL or Redis when:

-   **Multiple servers**: Need to share data across instances
-   **High concurrency**: Many simultaneous users/connections
-   **Advanced features**: Complex queries, replication, or enterprise features
-   **Production deployment**: Need enterprise-grade reliability

### Migration Path

When ready to scale beyond SQLite:

1. **PostgreSQL**: For ACID compliance and concurrent access
2. **Redis**: For high-performance caching and TTL management
3. **Hybrid**: PostgreSQL for persistence + Redis for performance
