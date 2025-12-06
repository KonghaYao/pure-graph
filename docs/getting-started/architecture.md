---
title: Architecture
---

# Architecture

Open LangGraph Server bridges the gap between LangGraph workflows and web applications, providing a standardized API layer that enables seamless integration across different JavaScript frameworks.

## Core Architecture

Open LangGraph Server uses a three-layer architecture built on standard Web APIs, making it framework-agnostic and portable:

```
┌─────────────────────────────────────────────────────────────────┐
│              Framework Adapters (Thin Wrappers)                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   Next.js    │  │   Hono.js    │  │   Others     │        │
│   │   Adapter    │  │   Adapter    │  │   (Any)      │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            Core Fetch Handler (Standard Web APIs)               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Request Handler (req: Request) => Response              │  │
│  │  • Route Matching  • Validation  • SSE Streaming         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LangGraph Integration                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ Assistants │  │  Threads   │  │    Runs    │              │
│  │    API     │  │    API     │  │    API     │              │
│  └────────────┘  └────────────┘  └────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                            ▼
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐   ┌─────▼────────┐   ┌────▼──────┐
│   Storage      │   │    Queue     │   │  Threads  │
│   Backend      │   │   Backend    │   │  Manager  │
│                │   │              │   │           │
│ • PostgreSQL   │   │ • Redis      │   │ • Status  │
│ • SQLite       │   │ • Memory     │   │ • State   │
│ • Redis        │   │              │   │           │
│ • Memory       │   │              │   │           │
└────────────────┘   └──────────────┘   └───────────┘
```

## Key Components

### Framework Adapters (Thin Wrappers)

Lightweight adapters that bridge framework-specific APIs to the standard fetch handler:

-   **Next.js Adapter**: Extracts context from `x-langgraph-context` header and handles Next.js initialization patterns
-   **Hono.js Adapter**: Extracts context from Hono's `langgraph_context` variable
-   **Standard Fetch Handler**: Core implementation works directly on any platform supporting Web APIs

**All adapters share the same core implementation**, ensuring:
-   Consistent behavior across platforms
-   Single source of truth for API logic
-   Easy migration between frameworks

### Core Fetch Handler (Standard Web APIs)

Platform-agnostic implementation using only standard `Request`/`Response` APIs:

-   **Route Matching**: Regex-based routing without framework dependencies
-   **Request Validation**: Zod-based runtime validation
-   **SSE Streaming**: Custom SSE implementation with heartbeat support
-   **Context Management**: Framework-agnostic context passing

Works on:
-   Cloudflare Workers
-   Deno Deploy
-   Vercel Edge Functions
-   Bun
-   Any platform with standard fetch APIs

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
┌───────────────┐
│  Web Request  │
└───────┬───────┘
        ▼
┌──────────────────────┐
│  Framework Adapter   │ ← Extract context from framework-specific sources
│  (Next.js/Hono/etc)  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Core Fetch Handler  │ ← Standard Request/Response processing
│  • Route matching    │
│  • Validation        │
│  • Context injection │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ LangGraph Execution  │ ← Graph runs with checkpoints
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  Storage & Queues    │ ← State persistence & streaming
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│    SSE Streaming     │ ← Real-time results with heartbeat
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│   HTTP Response      │
└────────────────────────┘
```

## Configuration Philosophy

Open LangGraph Server embraces "convention over configuration" with environment-based setup:

-   **Automatic Backend Selection**: Chooses storage based on available environment variables
-   **Sensible Defaults**: Works out-of-the-box with memory storage for development
-   **Progressive Enhancement**: Add databases and queues as needs grow

## Design Principles

-   **Platform Agnostic**: Core implementation uses only standard Web APIs (Request/Response)
-   **Framework Neutral**: Thin adapters make framework integration effortless
-   **Type Safe**: Full TypeScript support with Zod runtime validation
-   **Production Ready**: Built-in scalability, monitoring, and error handling
-   **Developer Friendly**: Simple APIs with comprehensive documentation
-   **Easy Migration**: Switch platforms without rewriting API logic

## Why This Architecture?

### Single Source of Truth
All framework adapters use the same core implementation, meaning:
-   Bug fixes apply everywhere instantly
-   New features available to all platforms
-   Consistent behavior across deployments

### Maximum Portability
Based on Web Standards (WHATWG Fetch API):
-   Run on Cloudflare Workers, Deno Deploy, Vercel Edge
-   No framework lock-in
-   Future-proof as standards evolve

### Minimal Overhead
Framework adapters are just thin wrappers:
-   Hono adapter: ~30 lines of code
-   Next.js adapter: ~40 lines of code
-   Direct fetch usage: 0 lines of adapter code
