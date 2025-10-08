import {
    Command,
    Config,
    Metadata,
    OnConflictBehavior,
    Run,
    RunStatus,
    SortOrder,
    Thread,
    ThreadSortBy,
    ThreadStatus,
} from '@langgraph-js/sdk';

export interface BaseThreadsManager<ValuesType = unknown> {
    setup(): Promise<void>;
    create(payload?: {
        metadata?: Metadata;
        threadId?: string;
        ifExists?: OnConflictBehavior;
        graphId?: string;
        supersteps?: Array<{ updates: Array<{ values: unknown; command?: Command; asNode: string }> }>;
    }): Promise<Thread<ValuesType>>;
    set(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<void>;
    search(query?: {
        metadata?: Metadata;
        limit?: number;
        offset?: number;
        status?: ThreadStatus;
        sortBy?: ThreadSortBy;
        sortOrder?: SortOrder;
    }): Promise<Thread<ValuesType>[]>;
    get(threadId: string): Promise<Thread<ValuesType>>;
    delete(threadId: string): Promise<void>;
    updateState(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<Pick<Config, 'configurable'>>;
    createRun(threadId: string, assistantId: string, payload?: { metadata?: Metadata }): Promise<Run>;
    listRuns(threadId: string, options?: { limit?: number; offset?: number; status?: RunStatus }): Promise<Run[]>;
    updateRun(runId: string, run: Partial<Run>): Promise<void>;
}
