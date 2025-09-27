import {
    Command,
    Metadata,
    OnConflictBehavior,
    Run,
    RunStatus,
    SortOrder,
    Thread,
    ThreadSortBy,
    ThreadStatus,
} from '@langgraph-js/sdk';

export class BaseThreadsManager<ValuesType = unknown> {
    create(payload?: {
        metadata?: Metadata;
        threadId?: string;
        ifExists?: OnConflictBehavior;
        graphId?: string;
        supersteps?: Array<{ updates: Array<{ values: unknown; command?: Command; asNode: string }> }>;
    }): Promise<Thread<ValuesType>> {
        throw new Error('Function not implemented.');
    }
    set(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<void> {
        throw new Error('Function not implemented.');
    }
    search(query?: {
        metadata?: Metadata;
        limit?: number;
        offset?: number;
        status?: ThreadStatus;
        sortBy?: ThreadSortBy;
        sortOrder?: SortOrder;
    }): Promise<Thread<ValuesType>[]> {
        throw new Error('Function not implemented.');
    }
    get(threadId: string): Promise<Thread<ValuesType>> {
        throw new Error('Function not implemented.');
    }
    delete(threadId: string): Promise<void> {
        throw new Error('Function not implemented.');
    }
    createRun(threadId: string, assistantId: string, payload?: { metadata?: Metadata }): Promise<Run> {
        throw new Error('Function not implemented.');
    }
    listRuns(threadId: string, options?: { limit?: number; offset?: number; status?: RunStatus }): Promise<Run[]> {
        throw new Error('Function not implemented.');
    }
    updateRun(runId: string, run: Partial<Run>): Promise<void> {
        throw new Error('Function not implemented.');
    }
}
