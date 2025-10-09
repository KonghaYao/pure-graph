import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // Clone the request headers and set the custom context header
    const requestHeaders = new Headers(request.headers);

    // Add custom context to x-langgraph-context header for langgraph routes
    if (request.nextUrl.pathname.startsWith('/api/langgraph/')) {
        const langgraphContext = {
            userId: 'demo-user-123',
            sessionId: 'demo-session-456',
            preferences: { theme: 'dark', language: 'zh' },
            metadata: { source: 'nextjs-demo', version: '1.0.0' },
            timestamp: new Date().toISOString(),
        };

        // Set the context header on the cloned request headers
        requestHeaders.set('x-langgraph-context', JSON.stringify(langgraphContext));
    }

    // Create response with modified request headers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Optionally set response headers
    response.headers.set('x-middleware-processed', 'true');

    return response;
}

export const config = {
    matcher: '/api/langgraph/:path*',
};
