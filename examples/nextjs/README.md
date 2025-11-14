This is a [Next.js](https://nextjs.org) project that demonstrates how to integrate Open LangGraph Server (a LangGraph API wrapper) with Next.js App Router.

## Features

-   **LangGraph Integration**: Ready-to-use LangGraph API endpoints
-   **Middleware**: Automatically injects custom context into LangGraph requests
-   **Custom Context**: Demonstrates how to pass user-specific data to your graphs

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
# or
yarn install && yarn dev
# or
pnpm install && pnpm dev
# or
bun install && bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Middleware

This project includes a `middleware.ts` that automatically adds custom context to all LangGraph API requests using the correct Next.js middleware pattern:

```typescript
// Clone request headers and modify them
const requestHeaders = new Headers(request.headers);
// Set custom context
requestHeaders.set('x-langgraph-context', JSON.stringify(langgraphContext));

// Pass modified headers to the API route
const response = NextResponse.next({
    request: { headers: requestHeaders },
});
```

-   **Route**: `/api/langgraph/*`
-   **Context Data**: Includes user ID, session ID, preferences, and metadata
-   **Header**: `x-langgraph-context`

The middleware ensures that every LangGraph request receives consistent context data that can be accessed in your graph logic using `getConfig().configurable`.

## API Endpoints

The following LangGraph API endpoints are available:

-   `GET /api/langgraph/assistants` - List assistants
-   `GET /api/langgraph/assistants/{assistantId}` - Get assistant details
-   `POST /api/langgraph/threads` - Create a thread
-   `GET /api/langgraph/threads` - List threads
-   `POST /api/langgraph/threads/{threadId}/runs/stream` - Stream run execution
-   And more...

## Learn More

To learn more about Open LangGraph Server and LangGraph:

-   [Open LangGraph Server Documentation](../../README.md) - Learn about Open LangGraph Server features and configuration
-   [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - Official LangGraph docs
-   [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API reference
