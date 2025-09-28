import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { streamState } from './graph/stream.js';
import { Assistant, Run, StreamMode, Metadata, AssistantGraph } from '@langchain/langgraph-sdk';
import { getGraph, GRAPHS } from './utils/getGraph.js';
import { BaseThreadsManager } from './threads/index.js';
import { globalMessageQueue } from './global.js';
import { AssistantSortBy, CancelAction, ILangGraphClient, RunStatus, SortOrder, StreamInputData } from './types.js';
export { registerGraph } from './utils/getGraph.js';

export const AssistantEndpoint: ILangGraphClient['assistants'] = {
    async search(query?: {
        graphId?: string;
        metadata?: Metadata;
        limit?: number;
        offset?: number;
        sortBy?: AssistantSortBy;
        sortOrder?: SortOrder;
    }): Promise<Assistant[]> {
        if (query?.graphId) {
            return [
                {
                    assistant_id: query.graphId,
                    graph_id: query.graphId,
                    config: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    metadata: {},
                    version: 1,
                    name: query.graphId,
                    description: '',
                } as Assistant,
            ];
        }
        return Object.entries(GRAPHS).map(
            ([graphId, _]) =>
                ({
                    assistant_id: graphId,
                    graph_id: graphId,
                    config: {},
                    metadata: {},
                    version: 1,
                    name: graphId,
                    description: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as Assistant),
        );
    },
    async getGraph(assistantId: string, options?: { xray?: boolean | number }): Promise<AssistantGraph> {
        const config = {};
        const graph = await getGraph(assistantId, config);
        const drawable = await graph.getGraphAsync({
            ...config,
            xray: options?.xray ?? undefined,
        });
        return drawable.toJSON() as AssistantGraph;
    },
};

export const createEndpoint = (threads: BaseThreadsManager): ILangGraphClient => {
    return {
        assistants: AssistantEndpoint,
        threads,
        runs: {
            list(threadId: string, options?: { limit?: number; offset?: number; status?: RunStatus }): Promise<Run[]> {
                return threads.listRuns(threadId, options);
            },
            async cancel(threadId: string, runId: string, wait?: boolean, action?: CancelAction): Promise<void> {
                return globalMessageQueue.cancelQueue(runId);
            },
            async *stream(threadId: string, assistantId: string, payload: StreamInputData) {
                if (!payload.config) {
                    payload.config = {
                        configurable: {
                            graph_id: assistantId,
                            thread_id: threadId,
                        },
                    };
                }

                const run = threads.createRun(threadId, assistantId, payload);

                for await (const data of streamState(threads, run, payload, {
                    attempt: 0,
                    getGraph,
                })) {
                    yield data;
                }
            },
            joinStream(
                threadId: string,
                runId: string,
                options?:
                    | {
                          signal?: AbortSignal;
                          cancelOnDisconnect?: boolean;
                          lastEventId?: string;
                          streamMode?: StreamMode | StreamMode[];
                      }
                    | AbortSignal,
            ): AsyncGenerator<{ id?: string; event: StreamEvent; data: any }> {
                throw new Error('Function not implemented.');
            },
        },
    };
};
