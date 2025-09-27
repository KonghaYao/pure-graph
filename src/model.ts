import { RunnableConfig } from '@langchain/core/runnables';
import { RunCommand } from './utils/getLangGraphCommand.js';
import { Checkpoint, DisconnectMode } from '@langgraph-js/sdk';

export type RunStatus = 'pending' | 'running' | 'error' | 'success' | 'timeout' | 'interrupted';

export type StreamMode =
    | 'values'
    | 'messages'
    | 'messages-tuple'
    | 'custom'
    | 'updates'
    | 'events'
    | 'debug'
    | 'checkpoints'
    | 'tasks';

export type MultitaskStrategy = 'reject' | 'rollback' | 'interrupt' | 'enqueue';

export interface RunKwargs {
    input?: Record<string, unknown> | null;
    metadata?: Metadata;
    config?: RunnableConfig;
    checkpointId?: string;
    checkpoint?: Omit<Checkpoint, 'thread_id'>;
    checkpoint_during?: boolean;
    interrupt_before?: '*' | string[];
    interrupt_after?: '*' | string[];
    signal?: AbortController['signal'];
    webhook?: string;
    on_disconnect?: DisconnectMode;
    after_seconds?: number;
    if_not_exists?: 'create' | 'reject';
    command?: RunCommand;
    onRunCreated?: (params: { run_id: string; thread_id?: string }) => void;
    stream_mode?: Array<StreamMode>;
    stream_subgraphs?: boolean;
    stream_resumable?: boolean;
    temporary?: boolean;
    feedback_keys?: string[];
    langsmith_tracer?: unknown;
    // [key: string]: unknown;
}

export type Metadata = Record<string, unknown>;
