---
title: Open LangGraph Server
---

# Open LangGraph Server

Open LangGraph Server is the easiest way to integrate LangGraph.js into your JavaScript applications. Run AI workflows seamlessly in Next.js, Hono.js, and other modern web frameworks with enterprise-grade storage and streaming.

## Why Open LangGraph Server?

Purpose-built for TypeScript and designed around LangGraph patterns, Open LangGraph Server gives you everything you need to deploy reliable AI applications.

Some highlights include:

-   **Platform Agnostic** - Core built on standard Web APIs (Request/Response), runs anywhere
-   **Framework Integration** - Thin adapters for Next.js, Hono.js, Cloudflare Workers, Deno, and more
-   **Enterprise Storage** - Multiple backends (SQLite, PostgreSQL, Redis) with automatic configuration
-   **Real-time Streaming** - High-performance SSE streaming with custom heartbeat implementation
-   **Thread Management** - Complete conversation lifecycle with status tracking and persistence
-   **Type Safety** - Full TypeScript support with Zod runtime validation
-   **Easy Migration** - Same core logic across all platforms, switch anytime

## What can you build?

-   AI-powered applications that combine reasoning and action
-   Conversational agents for customer support or internal tools
-   Workflow automations with complex multi-step processes
-   Real-time AI assistants with streaming responses
-   Multi-user applications with secure context isolation

## Get started

Follow the [Installation guide](install) for step-by-step setup:

```bash
pnpm add @langgraph-js/pure-graph
```

### Test with Studio

Use [Studio](studio) for interactive testing and debugging:

```bash
npx @langgraph-js/ui
```

Visit the URL shown in your terminal to explore your graphs visually.

Choose your platform to get started:

-   [Standard Fetch Handler](/docs/frameworks/fetch) - **Recommended**: Works on any platform with Web APIs
-   [Next.js Quick Start](/docs/frameworks/nextjs) - For full-stack React applications  
-   [Hono.js Quick Start](/docs/frameworks/hono) - For lightweight API servers

> **💡 New Architecture**: All adapters now use the same core fetch handler, making it easy to migrate between platforms. The fetch handler works on Cloudflare Workers, Deno Deploy, Vercel Edge, Bun, and more!

## Learn more

-   [Project Structure](project-structure) - Recommended folder organization
-   [Architecture Overview](/docs/overview) - Understand how it all works together
-   [Database Setup](/docs/storage/index) - Configure database persistence
-   [Authentication](/docs/auth/index) - Secure your endpoints
-   [API Reference](/docs/api/index) - Complete API documentation

## Need help?

-   [GitHub Issues](https://github.com/KonghaYao/open-langgraph-server/issues) - Report bugs or request features
-   [Examples](/docs/examples/nextjs-chat) - See it in action

We can't wait to see what you build with Open LangGraph Server! 🚀
