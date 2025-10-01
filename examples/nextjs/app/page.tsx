"use client";

import { useState } from "react";

export default function Home() {
    const [result, setResult] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const testAPI = async (
        endpoint: string,
        method: string = "GET",
        body?: any
    ) => {
        setLoading(true);
        setResult("");

        try {
            const options: RequestInit = {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
            };

            if (body && method !== "GET") {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`/api${endpoint}`, options);
            const data = await response.text();

            setResult(`状态: ${response.status}\n响应: ${data}`);
        } catch (error) {
            setResult(`错误: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const testStream = async () => {
        setLoading(true);
        setResult("");

        try {
            // 先创建一个线程
            const threadResponse = await fetch("/api/threads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const thread = await threadResponse.json();

            // 测试流式接口
            const response = await fetch(
                `/api/threads/${thread.thread_id}/runs/stream`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        assistant_id: "test-assistant",
                        input: { message: "Hello" },
                    }),
                }
            );

            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let result = "流式响应:\n";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    result += chunk;
                    setResult(result);
                }
            }
        } catch (error) {
            setResult(`错误: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="font-sans min-h-screen p-8">
            <main className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">
                    Pure Graph Next.js 统一路由适配器演示
                </h1>

                <div className="grid gap-6">
                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">API 测试</h2>
                        <div className="grid gap-4">
                            <div className="flex gap-2">
                                <button
                                    onClick={() =>
                                        testAPI("/assistants/search", "POST", {
                                            limit: 10,
                                        })
                                    }
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50">
                                    搜索助手
                                </button>
                                <button
                                    onClick={() =>
                                        testAPI("/threads", "POST", {})
                                    }
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50">
                                    创建线程
                                </button>
                                <button
                                    onClick={() =>
                                        testAPI("/threads/search", "POST", {
                                            limit: 5,
                                        })
                                    }
                                    disabled={loading}
                                    className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50">
                                    搜索线程
                                </button>
                            </div>
                            <button
                                onClick={testStream}
                                disabled={loading}
                                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">
                                测试流式接口 (SSE)
                            </button>
                        </div>
                    </div>

                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">API 响应</h2>
                        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                            {loading
                                ? "加载中..."
                                : result || "点击上方按钮测试 API"}
                        </pre>
                    </div>

                    <div className="border rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            统一路由 API 端点 (所有请求都通过 /api/[...path])
                        </h2>
                        <div className="grid gap-2 text-sm">
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    POST /api/assistants/search
                                </code>{" "}
                                - 搜索助手
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    GET /api/assistants/[id]/graph
                                </code>{" "}
                                - 获取助手图谱
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    POST /api/threads
                                </code>{" "}
                                - 创建线程
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    POST /api/threads/search
                                </code>{" "}
                                - 搜索线程
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    GET /api/threads/[id]
                                </code>{" "}
                                - 获取线程
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    DELETE /api/threads/[id]
                                </code>{" "}
                                - 删除线程
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    GET /api/threads/[id]/runs
                                </code>{" "}
                                - 获取运行列表
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    POST /api/threads/[id]/runs/stream
                                </code>{" "}
                                - 流式运行 (SSE)
                            </div>
                            <div>
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    POST /api/threads/[id]/runs/[run_id]/cancel
                                </code>{" "}
                                - 取消运行
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
