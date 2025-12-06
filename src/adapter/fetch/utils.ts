import z from 'zod';

/**
 * 解析 URL 路径参数
 */
export function parsePathParams(url: string, pattern: string): Record<string, string> {
    const patternParts = pattern.split('/').filter((p) => p);
    const urlParts = new URL(url).pathname.split('/').filter((p) => p);
    const params: Record<string, string> = {};

    patternParts.forEach((part, index) => {
        if (part.startsWith(':')) {
            const paramName = part.slice(1);
            params[paramName] = urlParts[index];
        }
    });

    return params;
}

/**
 * 解析查询参数并转换类型
 */
export function parseQueryParams(url: string): Record<string, string | number | boolean> {
    const searchParams = new URL(url).searchParams;
    const params: Record<string, string | number | boolean> = {};

    searchParams.forEach((value, key) => {
        // 尝试转换为数字
        if (!isNaN(Number(value)) && value !== '') {
            params[key] = Number(value);
        }
        // 尝试转换为布尔值
        else if (value === 'true' || value === 'false') {
            params[key] = value === 'true';
        }
        // 保持字符串
        else {
            params[key] = value;
        }
    });

    return params;
}

/**
 * 验证数据
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        throw new ValidationError(result.error.issues);
    }
    return result.data;
}

/**
 * 验证错误
 */
export class ValidationError extends Error {
    public errors: z.ZodIssue[];

    constructor(errors: z.ZodIssue[]) {
        super('Validation failed');
        this.name = 'ValidationError';
        this.errors = errors;
    }
}

/**
 * 创建 JSON 响应
 */
export function jsonResponse(data: any, status = 200, headers?: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });
}

/**
 * 创建错误响应
 */
export function errorResponse(error: unknown, status = 500): Response {
    if (error instanceof ValidationError) {
        return jsonResponse(
            {
                error: 'Validation Error',
                details: error.errors,
            },
            400,
        );
    }

    return jsonResponse(
        {
            error: error instanceof Error ? error.message : 'Unknown error',
        },
        status,
    );
}

/**
 * 创建 SSE 流响应
 */
export function createSSEStream(streamFn: (writer: SSEWriter) => Promise<void>): Response {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    let isClosed = false;

    const stream = new ReadableStream<Uint8Array>({
        async start(ctrl) {
            controller = ctrl;
            const encoder = new TextEncoder();

            const writer: SSEWriter = {
                writeSSE: async ({ data, event, id }) => {
                    // 检查流是否已关闭
                    if (isClosed) {
                        return;
                    }

                    try {
                        let message = '';

                        if (id) {
                            message += `id: ${id}\n`;
                        }
                        if (event) {
                            message += `event: ${event}\n`;
                        }
                        message += `data: ${data}\n\n`;

                        controller.enqueue(encoder.encode(message));
                    } catch (error) {
                        // 忽略写入已关闭流的错误
                        if (!isClosed) {
                            throw error;
                        }
                    }
                },
                close: () => {
                    if (!isClosed) {
                        isClosed = true;
                        try {
                            controller.close();
                        } catch (error) {
                            // 流可能已经关闭
                        }
                    }
                },
            };

            try {
                await streamFn(writer);
            } catch (error) {
                console.error('SSE stream error:', error);
            } finally {
                if (!isClosed) {
                    isClosed = true;
                    try {
                        controller.close();
                    } catch (error) {
                        // 流可能已经关闭
                    }
                }
            }
        },
        cancel() {
            isClosed = true;
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        },
    });
}

export interface SSEWriter {
    writeSSE: (data: { data: string; event?: string; id?: string }) => Promise<void>;
    close: () => void;
}

/**
 * 为 SSE 流添加心跳功能
 */
export function withHeartbeat(
    streamFn: (writer: SSEWriter) => Promise<void>,
    heartbeatInterval: number = process.env.HEARTBEAT_INTERVAL ? parseInt(process.env.HEARTBEAT_INTERVAL) : 1500,
): (writer: SSEWriter) => Promise<void> {
    return async (writer: SSEWriter) => {
        let heartbeatTimer: NodeJS.Timeout | null = null;

        const startHeartbeat = () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
            heartbeatTimer = setInterval(async () => {
                try {
                    await writer.writeSSE({ event: 'ping', data: '{}' });
                } catch (error) {
                    if (heartbeatTimer) {
                        clearInterval(heartbeatTimer);
                        heartbeatTimer = null;
                    }
                }
            }, heartbeatInterval);
        };

        const stopHeartbeat = () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
                heartbeatTimer = null;
            }
        };

        const proxiedWriter: SSEWriter = {
            writeSSE: async (data) => {
                stopHeartbeat();
                await writer.writeSSE(data);
                startHeartbeat();
            },
            close: () => {
                stopHeartbeat();
                writer.close();
            },
        };

        startHeartbeat();

        try {
            await streamFn(proxiedWriter);
        } finally {
            stopHeartbeat();
        }
    };
}
