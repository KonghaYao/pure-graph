import { BaseThreadsManager } from '../../threads/index.js';
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

export class MemoryThreadsManager<ValuesType = unknown> extends BaseThreadsManager {
    private threads: Thread<ValuesType>[] = [];

    async create(payload?: {
        metadata?: Metadata;
        threadId?: string;
        ifExists?: OnConflictBehavior;
        graphId?: string;
        supersteps?: Array<{ updates: Array<{ values: unknown; command?: Command; asNode: string }> }>;
    }): Promise<Thread<ValuesType>> {
        const threadId = payload?.threadId || crypto.randomUUID();
        if (payload?.ifExists === 'raise' && this.threads.some((t) => t.thread_id === threadId)) {
            throw new Error(`Thread with ID ${threadId} already exists.`);
        }

        const thread: Thread<ValuesType> = {
            thread_id: threadId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: payload?.metadata || {},
            status: 'idle',
            values: null as unknown as ValuesType,
            interrupts: {},
        };
        this.threads.push(thread);
        return thread;
    }

    async search(query?: {
        metadata?: Metadata;
        limit?: number;
        offset?: number;
        status?: ThreadStatus;
        sortBy?: ThreadSortBy;
        sortOrder?: SortOrder;
    }): Promise<Thread<ValuesType>[]> {
        let filteredThreads = [...this.threads];
        if (query?.status) {
            filteredThreads = filteredThreads.filter((t) => t.status === query.status);
        }

        if (query?.metadata) {
            for (const key in query.metadata) {
                if (Object.prototype.hasOwnProperty.call(query.metadata, key)) {
                    filteredThreads = filteredThreads.filter(
                        (t) => t.metadata && t.metadata[key] === query.metadata?.[key],
                    );
                }
            }
        }

        if (query?.sortBy) {
            filteredThreads.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (query.sortBy) {
                    case 'created_at':
                        aValue = new Date(a.created_at).getTime();
                        bValue = new Date(b.created_at).getTime();
                        break;
                    case 'updated_at':
                        aValue = new Date(a.updated_at).getTime();
                        bValue = new Date(b.updated_at).getTime();
                        break;
                    default:
                        return 0;
                }

                if (query.sortOrder === 'desc') {
                    return bValue - aValue;
                } else {
                    return aValue - bValue;
                }
            });
        }

        const offset = query?.offset || 0;
        const limit = query?.limit || filteredThreads.length;

        return filteredThreads.slice(offset, offset + limit);
    }

    async get(threadId: string): Promise<Thread<ValuesType>> {
        const thread = this.threads.find((t) => t.thread_id === threadId);
        if (!thread) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }
        return thread;
    }
    async set(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<void> {
        const index = this.threads.findIndex((t) => t.thread_id === threadId);
        if (index === -1) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }
        this.threads[index] = { ...this.threads[index], ...thread };
    }
    async delete(threadId: string): Promise<void> {
        const initialLength = this.threads.length;
        this.threads = this.threads.filter((t) => t.thread_id !== threadId);
        if (this.threads.length === initialLength) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }
    }
    runs: Run[] = [];
    async createRun(threadId: string, assistantId: string, payload?: { metadata?: Metadata }): Promise<Run> {
        const runId = crypto.randomUUID();
        const run: Run = {
            run_id: runId,
            thread_id: threadId,
            assistant_id: assistantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'pending',
            metadata: payload?.metadata ?? {},
            multitask_strategy: 'reject',
        };
        this.runs.push(run);
        return run;
    }
    async listRuns(
        threadId: string,
        options?: { limit?: number; offset?: number; status?: RunStatus },
    ): Promise<Run[]> {
        let filteredRuns = [...this.runs];
        if (options?.status) {
            filteredRuns = filteredRuns.filter((r) => r.status === options.status);
        }
        if (options?.limit) {
            filteredRuns = filteredRuns.slice(options.offset || 0, (options.offset || 0) + options.limit);
        }
        return filteredRuns;
    }
    async updateRun(runId: string, run: Partial<Run>): Promise<void> {
        const index = this.runs.findIndex((r) => r.run_id === runId);
        if (index === -1) {
            throw new Error(`Run with ID ${runId} not found.`);
        }
        this.runs[index] = { ...this.runs[index], ...run };
    }
}
