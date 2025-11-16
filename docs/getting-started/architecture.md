---
title: Architecture
---

# Architecture

Open LangGraph Server bridges the gap between LangGraph workflows and web applications, providing a standardized API layer that enables seamless integration across different JavaScript frameworks.

## Core Architecture

The architecture follows a layered approach that separates concerns while maintaining tight integration:

```
┌────────────────────┐    ┌────────────────────────────┐    ┌────────────────────┐
│   Framework        │    │    Open LangGraph Server   │    │    LangGraph       │
│   Adapters         │◄──►│         API Layer          │◄──►│    Workflows       │
│                    │    │                            │    │                    │
│ • Next.js          │    │ • REST Endpoints           │    │ • StateGraphs      │
│ • Hono.js          │    │ • Type Validation          │    │ • Agents           │
└────────────────────┘    └────────────────────────────┘    └────────────────────┘
                                   ▲
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
        ┌───────▼────────┐   ┌─────▼────~~┐   ┌──────▼──────┐
        │   Storage      │   │   Queue    │   │   Threads   │
        │   Layer        │   │   Layer    │   │   Manager   │
        │                │   │            │   │             │
        │ • SQLite       │   │ • Redis    │   │ • Lifecycle │
        │ • PostgreSQL   │   │ • Memory   │   │ • Status    │
        │ • Redis        │   │            │   │ • Metadata  │
        │ • Memory       │   │            │   │             │
        └────────────────┘   └────────────┘   └─────────────┘
```

## Key Components

### Framework Integration Layer

Provides HTTP interfaces and request handling for popular JavaScript frameworks:

-   **Next.js Adapter**: Leverages App Router for optimal performance and developer experience
-   **Hono.js Adapter**: Lightweight, high-performance HTTP interface with minimal overhead
-   **Context Injection**: Passes framework-specific data (authentication, sessions) to graph executions

### API Abstraction Layer

Implements LangGraph SDK-compatible REST endpoints with streaming support:

-   **Assistants API**: Graph discovery and metadata management
-   **Threads API**: Conversation lifecycle and state management
-   **Runs API**: Graph execution with real-time streaming results
-   **Type Safety**: Runtime validation using Zod schemas

### Storage & Persistence Layer

Flexible storage backends for different deployment scenarios:

-   **Checkpoint Storage**: Persists graph state across executions (SQLite/PostgreSQL/Redis/Memory)
-   **Message Queues**: Handles real-time streaming data with automatic backend selection
-   **Thread Management**: Coordinates conversation lifecycles and metadata

## Data Flow

```
Web Request → Framework Adapter → API Validation → Context Injection
                                                            ↓
LangGraph Execution → State Checkpointing → Result Streaming
                                                            ↓
HTTP Response ← Framework Formatting ← Queue Management ← Storage
```

## Configuration Philosophy

Open LangGraph Server embraces "convention over configuration" with environment-based setup:

-   **Automatic Backend Selection**: Chooses storage based on available environment variables
-   **Sensible Defaults**: Works out-of-the-box with memory storage for development
-   **Progressive Enhancement**: Add databases and queues as needs grow

## Design Principles

-   **Framework Agnostic**: Clean separation allows integration with any JavaScript framework
-   **Type Safe**: Full TypeScript support with runtime validation
-   **Production Ready**: Built-in scalability, monitoring, and error handling
-   **Developer Friendly**: Simple APIs with comprehensive documentation
