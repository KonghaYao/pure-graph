---
title: Project Structure
---

# Project Structure

Open LangGraph Server integrates seamlessly into your existing JavaScript/TypeScript projects. While it's flexible about how you organize your code, following a consistent structure makes your project maintainable and easy to navigate.

This guide shows recommended folder structures for different frameworks and project types.

## Hono.js Projects

For lightweight API servers with Hono.js, we recommend this structure:

```
my-hono-app/
├── src/
│   ├── agent/
│   │   ├── graph.ts              # Your LangGraph definition
│   │   ├── index.ts              # Graph registration
│   │   └── types.ts              # Type definitions
│   ├── routes/
│   │   ├── auth.ts               # Authentication routes
│   │   └── files.ts              # File handling routes
│   ├── lib/
│   │   ├── auth.ts               # Authentication utilities
│   │   └── validation.ts         # Input validation
│   └── app.ts                    # Main Hono application
├── .env                          # Environment variables
├── package.json
├── tsconfig.json
└── studio.ts                     # Optional: Studio configuration
```

### Key Files

| File/Folder          | Description                                 |
| -------------------- | ------------------------------------------- |
| `src/agent/graph.ts` | Your main LangGraph workflow definition     |
| `src/agent/index.ts` | Graph registration and export               |
| `src/app.ts`         | Hono application setup with middleware      |
| `src/routes/`        | Additional API routes beyond LangGraph      |
| `studio.ts`          | Studio configuration for testing (optional) |

## Next.js Projects

For full-stack applications with Next.js:

```
my-nextjs-app/
├── app/
│   ├── api/
│   │   └── langgraph/
│   │       └── [...path]/
│   │           └── route.ts        # LangGraph API routes
│   ├── layout.tsx
│   └── page.tsx
├── agent/
│   ├── graph.ts                   # LangGraph definition
│   ├── index.ts                   # Graph registration
│   └── state.ts                   # Graph state types
├── lib/
│   ├── auth.ts                    # Authentication logic
│   └── utils.ts                   # Utility functions
├── .env.local                     # Environment variables
├── package.json
├── next.config.js
└── tsconfig.json
```

### Key Files

| File/Folder                            | Description                             |
| -------------------------------------- | --------------------------------------- |
| `app/api/langgraph/[...path]/route.ts` | Next.js API route handler for LangGraph |
| `agent/graph.ts`                       | Your LangGraph workflow                 |
| `agent/index.ts`                       | Graph registration for the API route    |
