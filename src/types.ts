import {
    Thread,
    Assistant,
    Run,
    StreamMode,
    Command,
    Metadata,
    AssistantGraph,
    OnConflictBehavior,
    ThreadStatus,
    Checkpoint,
} from '@langchain/langgraph-sdk';
import { StreamEvent } from '@langchain/core/tracers/log_stream';
import { EventMessage } from './queue/event_message';
import { RunnableConfig } from '@langchain/core/runnables';

// 基础类型定义
export type AssistantSortBy = 'assistant_id' | 'graph_id' | 'name' | 'created_at' | 'updated_at';
export type ThreadSortBy = 'thread_id' | 'status' | 'created_at' | 'updated_at';
export type SortOrder = 'asc' | 'desc';
export type RunStatus = 'pending' | 'running' | 'error' | 'success' | 'timeout' | 'interrupted';
export type MultitaskStrategy = 'reject' | 'interrupt' | 'rollback' | 'enqueue';
export type DisconnectMode = 'cancel' | 'continue';
export type OnCompletionBehavior = 'complete' | 'continue';
export type CancelAction = 'interrupt' | 'rollback';

export type StreamInputData = {
    input?: Record<string, unknown> | null;
    metadata?: Metadata;
    config?: RunnableConfig;
    checkpointId?: string;
    checkpoint?: Omit<Checkpoint, 'thread_id'>;
    checkpoint_during?: boolean;
    interrupt_before?: '*' | string[];
    interrupt_after?: '*' | string[];
    multitask_strategy?: MultitaskStrategy;
    on_completion?: OnCompletionBehavior;
    signal?: AbortController['signal'];
    webhook?: string;
    on_disconnect?: DisconnectMode;
    after_seconds?: number;
    if_not_exists?: 'create' | 'reject';
    command?: Command;
    onRunCreated?: (params: { run_id: string; thread_id?: string }) => void;
    stream_mode?: StreamMode[];
    stream_subgraphs?: boolean;
    stream_resumable?: boolean;
    feedback_keys?: string[];
    temporary?: boolean;
};
/**
 * 兼容 LangGraph SDK 的接口定义，方便进行无侵入式的扩展
 */
export interface ILangGraphClient<TStateType = unknown> {
    assistants: {
        search(query?: {
            graphId?: string;
            metadata?: Metadata;
            limit?: number;
            offset?: number;
            sortBy?: AssistantSortBy;
            sortOrder?: SortOrder;
        }): Promise<Assistant[]>;
        getGraph(assistantId: string, options?: { xray?: boolean | number }): Promise<AssistantGraph>;
    };
    threads: {
        create(payload?: {
            metadata?: Metadata;
            thread_id?: string;
            if_exists?: OnConflictBehavior;
            graph_id?: string;
            // supersteps?: Array<{
            //     updates: Array<{
            //         values: unknown;
            //         command?: Command;
            //         as_node: string;
            //     }>;
            // }>;
        }): Promise<Thread<TStateType>>;
        search(query?: {
            metadata?: Metadata;
            limit?: number;
            offset?: number;
            status?: ThreadStatus;
            sortBy?: ThreadSortBy;
            sortOrder?: SortOrder;
        }): Promise<Thread<TStateType>[]>;
        get(threadId: string): Promise<Thread<TStateType>>;
        delete(threadId: string): Promise<void>;
    };
    runs: {
        list(
            threadId: string,
            options?: {
                limit?: number;
                offset?: number;
                status?: RunStatus;
            },
        ): Promise<Run[]>;

        stream(threadId: string, assistantId: string, payload?: StreamInputData): AsyncGenerator<EventMessage>;
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
        ): AsyncGenerator<{ id?: string; event: StreamEvent; data: any }>;
        cancel(threadId: string, runId: string, wait?: boolean, action?: CancelAction): Promise<void>;
    };
}
