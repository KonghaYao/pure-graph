---
title: Next.js Chat Application Example
---

# Next.js Chat Application Example

This example demonstrates how to build a complete chat application using Pure Graph with Next.js, featuring real-time streaming, context-aware responses, and persistent conversations.

## Project Structure

```
chat-app/
├── app/
│   ├── api/
│   │   └── langgraph/
│   │       └── [...path]/
│   │           └── route.ts
│   ├── chat/
│   │   └── [threadId]/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ChatInterface.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── ThreadList.tsx
├── lib/
│   ├── langgraph-client.ts
│   ├── streaming.ts
│   └── utils.ts
├── middleware.ts
├── agent/
│   ├── index.ts
│   └── chat-assistant.ts
├── .env.local
└── package.json
```

## Installation

```bash
npm install @langgraph-js/pure-graph @langchain/langgraph @langchain/core @langchain/openai next react
```

## Environment Configuration

```bash
# .env.local
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration (choose one)
SQLITE_DATABASE_URI=./.langgraph_api/chat.db
# DATABASE_URL=postgresql://user:pass@localhost:5432/chat_db
# REDIS_URL=redis://localhost:6379

# Optional: Redis for message queues
# REDIS_URL=redis://localhost:6379
```

## API Route Setup

```typescript
// app/api/langgraph/[...path]/route.ts
import { NextRequest } from 'next/server';
import { ensureInitialized } from '@langgraph-js/pure-graph/dist/adapter/nextjs/index';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const registerGraph = async () => {
    await import('@/agent/index');
};

export const GET = async (req: NextRequest) => {
    const { GET } = await ensureInitialized(registerGraph);
    return GET(req);
};

export const POST = async (req: NextRequest) => {
    const { POST } = await ensureInitialized(registerGraph);
    return POST(req);
};

export const DELETE = async (req: NextRequest) => {
    const { DELETE } = await ensureInitialized(registerGraph);
    return DELETE(req);
};
```

## Context Injection Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    if (request.nextUrl.pathname.startsWith('/api/langgraph/')) {
        // Extract user information from cookies/session
        const userId = request.cookies.get('user-id')?.value || 'anonymous';
        const sessionId = request.cookies.get('session-id')?.value || generateSessionId();

        const langgraphContext = {
            user: {
                id: userId,
                preferences: {
                    model: 'gpt-4',
                    temperature: 0.7,
                },
            },
            session: {
                id: sessionId,
                metadata: {
                    userAgent: request.headers.get('user-agent'),
                    ip: request.ip || request.headers.get('x-forwarded-for'),
                },
            },
            timestamp: new Date().toISOString(),
        };

        requestHeaders.set('x-langgraph-context', JSON.stringify(langgraphContext));

        // Set session cookie if not exists
        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });

        if (!request.cookies.get('session-id')) {
            response.cookies.set('session-id', sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            });
        }

        return response;
    }

    return NextResponse.next();
}

function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const config = {
    matcher: '/api/langgraph/:path*',
};
```

## Graph Implementation

```typescript
// agent/chat-assistant.ts
import { entrypoint, getConfig } from '@langchain/langgraph';
import { createReactAgent, createReactAgentAnnotation } from '@langchain/langgraph/prebuilt';
import { createState } from '@langgraph-js/pro';
import { createEntrypointGraph } from '@langgraph-js/pure-graph';
import { ChatOpenAI } from '@langchain/openai';

const State = createState(createReactAgentAnnotation()).build({});

const workflow = entrypoint('chat-assistant', async (state) => {
    const config = getConfig();

    // Access injected context
    const user = config.configurable?.user;
    const session = config.configurable?.session;

    console.log('Processing chat for user:', user?.id, 'session:', session?.id);

    // Create personalized agent
    const agent = createReactAgent({
        llm: new ChatOpenAI({
            model: user?.preferences?.model || 'gpt-4',
            temperature: user?.preferences?.temperature || 0.7,
        }),
        prompt: `You are a helpful AI assistant. The user is ${user?.id || 'anonymous'}.
    Be friendly, informative, and adapt your communication style to be engaging.
    Current session: ${session?.id}`,
        tools: [], // Add tools as needed
    });

    return agent.invoke(state);
});

export const chatGraph = createEntrypointGraph({
    stateSchema: State,
    graph: workflow,
});
```

```typescript
// agent/index.ts
import { registerGraph } from '@langgraph-js/pure-graph';
import { chatGraph } from './chat-assistant';

registerGraph('chat-assistant', chatGraph);
export {};
```

## Client-Side Components

### Main Layout

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Pure Graph Chat',
    description: 'AI-powered chat application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="h-screen flex flex-col">
                <header className="bg-blue-600 text-white p-4">
                    <h1 className="text-xl font-bold">Pure Graph Chat</h1>
                </header>
                <main className="flex-1 overflow-hidden">{children}</main>
            </body>
        </html>
    );
}
```

### Home Page with Thread List

```tsx
// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LangGraphClient } from '@/lib/langgraph-client';

export default function HomePage() {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const client = new LangGraphClient();

    useEffect(() => {
        loadThreads();
    }, []);

    const loadThreads = async () => {
        try {
            const threadList = await client.getThreads();
            setThreads(threadList);
        } catch (error) {
            console.error('Failed to load threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const createNewThread = async () => {
        try {
            const thread = await client.createThread({
                metadata: {
                    title: `Chat ${new Date().toLocaleString()}`,
                    created: new Date().toISOString(),
                },
            });
            window.location.href = `/chat/${thread.thread_id}`;
        } catch (error) {
            console.error('Failed to create thread:', error);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">Loading...</div>;
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Your Conversations</h2>
                <button
                    onClick={createNewThread}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    New Chat
                </button>
            </div>

            <div className="grid gap-4">
                {threads.map((thread) => (
                    <Link
                        key={thread.thread_id}
                        href={`/chat/${thread.thread_id}`}
                        className="block p-4 border rounded hover:bg-gray-50"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium">
                                    {thread.metadata?.title || `Chat ${thread.thread_id.slice(-8)}`}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {new Date(thread.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <span
                                className={`px-2 py-1 text-xs rounded ${
                                    thread.status === 'idle'
                                        ? 'bg-green-100 text-green-800'
                                        : thread.status === 'busy'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {thread.status}
                            </span>
                        </div>
                    </Link>
                ))}

                {threads.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <p>No conversations yet. Start your first chat!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
```

### Chat Interface Component

```tsx
// components/ChatInterface.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { LangGraphClient } from '@/lib/langgraph-client';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatInterfaceProps {
    threadId: string;
}

export default function ChatInterface({ threadId }: ChatInterfaceProps) {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [thread, setThread] = useState(null);
    const client = useRef(new LangGraphClient());

    useEffect(() => {
        loadThread();
        loadMessages();
    }, [threadId]);

    const loadThread = async () => {
        try {
            const threadData = await client.current.getThread(threadId);
            setThread(threadData);
        } catch (error) {
            console.error('Failed to load thread:', error);
        }
    };

    const loadMessages = async () => {
        try {
            // Load existing messages from thread state
            const threadData = await client.current.getThread(threadId);
            if (threadData.values?.messages) {
                setMessages(threadData.values.messages);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const sendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage = {
            role: 'user',
            content: content.trim(),
            id: `msg_${Date.now()}`,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const stream = client.current.streamRun(threadId, 'chat-assistant', {
                messages: [...messages, userMessage],
            });

            let assistantMessage = {
                role: 'assistant',
                content: '',
                id: `msg_${Date.now() + 1}`,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            for await (const chunk of stream) {
                if (chunk.event === 'messages') {
                    const messageData = chunk.data;
                    if (messageData.role === 'assistant') {
                        assistantMessage.content += messageData.content || '';
                        setMessages((prev) => {
                            const newMessages = [...prev];
                            const lastMessage = newMessages[newMessages.length - 1];
                            if (lastMessage.id === assistantMessage.id) {
                                lastMessage.content = assistantMessage.content;
                            }
                            return newMessages;
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error. Please try again.',
                    id: `error_${Date.now()}`,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
                <MessageList messages={messages} isLoading={isLoading} />
            </div>
            <div className="border-t p-4">
                <MessageInput onSend={sendMessage} disabled={isLoading} />
            </div>
        </div>
    );
}
```

### Message List Component

```tsx
// components/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="h-full overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                        }`}
                    >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div
                                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: '0.1s' }}
                            ></div>
                            <div
                                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: '0.2s' }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
```

### Message Input Component

```tsx
// components/MessageInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';

interface MessageInputProps {
    onSend: (message: string) => void;
    disabled: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSend(message);
            setMessage('');
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex space-x-2">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={disabled}
                className="flex-1 p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
            />
            <button
                onClick={handleSend}
                disabled={!message.trim() || disabled}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Send
            </button>
        </div>
    );
}
```

## LangGraph Client Library

```typescript
// lib/langgraph-client.ts
export class LangGraphClient {
    private baseUrl = '/api/langgraph';

    async createThread(metadata?: any): Promise<Thread> {
        const response = await fetch(`${this.baseUrl}/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create thread: ${response.statusText}`);
        }

        return response.json();
    }

    async getThread(threadId: string): Promise<Thread> {
        const response = await fetch(`${this.baseUrl}/threads/${threadId}`);

        if (!response.ok) {
            throw new Error(`Failed to get thread: ${response.statusText}`);
        }

        return response.json();
    }

    async getThreads(limit = 20): Promise<Thread[]> {
        const response = await fetch(`${this.baseUrl}/threads?limit=${limit}&sort_by=updated_at&sort_order=desc`);

        if (!response.ok) {
            throw new Error(`Failed to get threads: ${response.statusText}`);
        }

        return response.json();
    }

    async *streamRun(threadId: string, assistantId: string, input: any): AsyncGenerator<StreamEvent> {
        const response = await fetch(`${this.baseUrl}/threads/${threadId}/runs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistant_id: assistantId,
                input,
                stream_mode: ['messages', 'values'],
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to start run: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            yield event;
                        } catch (error) {
                            console.warn('Failed to parse stream event:', error);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    async cancelRun(threadId: string, runId: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/threads/${threadId}/runs/${runId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(`Failed to cancel run: ${response.statusText}`);
        }
    }
}

interface Thread {
    thread_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    metadata?: any;
    values?: any;
}

interface StreamEvent {
    event: string;
    data: any;
    metadata?: any;
}
```

## Chat Page

```tsx
// app/chat/[threadId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default function ChatPage() {
    const params = useParams();
    const threadId = params.threadId as string;

    return <ChatInterface threadId={threadId} />;
}
```

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Features Demonstrated

-   **Real-time streaming** - Messages stream in real-time using Server-Sent Events
-   **Persistent conversations** - Thread state is maintained across sessions
-   **Context injection** - User and session context is passed to the graph
-   **Error handling** - Graceful error handling and user feedback
-   **Responsive UI** - Modern, responsive chat interface
-   **Type safety** - Full TypeScript support throughout

## Extending the Example

### Adding File Uploads

```typescript
// components/FileUpload.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            onFileSelect(acceptedFiles);
        },
        [onFileSelect],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
            'text/*': ['.txt', '.md'],
            'application/pdf': ['.pdf'],
        },
        maxFiles: 5,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
        >
            <input {...getInputProps()} />
            {isDragActive ? <p>Drop the files here...</p> : <p>Drag & drop files here, or click to select files</p>}
        </div>
    );
}
```

### Adding Message Reactions

```typescript
// components/MessageReactions.tsx
'use client';

import { useState } from 'react';

interface MessageReactionsProps {
    messageId: string;
    reactions: Record<string, number>;
    onReact: (messageId: string, emoji: string) => void;
}

export function MessageReactions({ messageId, reactions, onReact }: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);

    const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

    return (
        <div className="flex items-center space-x-1 mt-1">
            {Object.entries(reactions).map(([emoji, count]) => (
                <button
                    key={emoji}
                    onClick={() => onReact(messageId, emoji)}
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
                >
                    <span>{emoji}</span>
                    <span>{count}</span>
                </button>
            ))}

            <button
                onClick={() => setShowPicker(!showPicker)}
                className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
            >
                +
            </button>

            {showPicker && (
                <div className="absolute mt-8 bg-white border rounded shadow-lg p-2 flex space-x-1">
                    {commonEmojis.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => {
                                onReact(messageId, emoji);
                                setShowPicker(false);
                            }}
                            className="hover:bg-gray-100 p-1 rounded"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
```

This example provides a complete, production-ready chat application that demonstrates the full capabilities of Pure Graph. The code is well-structured, type-safe, and includes proper error handling and user experience considerations.
