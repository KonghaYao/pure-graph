import { BaseThreadsManager } from '../../threads/index.js';
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
import type { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import type { Pool } from 'pg';
import { getGraph } from '../../utils/getGraph.js';
import { serialiseAsDict } from '../../graph/stream.js';

interface ThreadRow {
    thread_id: string;
    created_at: Date;
    updated_at: Date;
    metadata: any;
    status: string;
    values: any;
    interrupts: any;
}

interface RunRow {
    run_id: string;
    thread_id: string;
    assistant_id: string;
    created_at: Date;
    updated_at: Date;
    status: string;
    metadata: any;
    multitask_strategy: string;
}

export class PostgresThreadsManager<ValuesType = unknown> implements BaseThreadsManager<ValuesType> {
    private pool: Pool;
    private isSetup: boolean = false;

    constructor(checkpointer: PostgresSaver) {
        // 访问 PostgresSaver 的 pool 属性（虽然是 private，但在运行时可以访问）
        this.pool = (checkpointer as any).pool;
        this.setup();
    }

    private async setup(): Promise<void> {
        if (this.isSetup) {
            return;
        }

        // 创建 threads 表
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS threads (
                thread_id TEXT PRIMARY KEY,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                metadata JSONB NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'idle',
                "values" JSONB,
                interrupts JSONB NOT NULL DEFAULT '{}'
            )
        `);

        // 创建 runs 表
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL,
                assistant_id TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                metadata JSONB NOT NULL DEFAULT '{}',
                multitask_strategy TEXT NOT NULL DEFAULT 'reject',
                FOREIGN KEY (thread_id) REFERENCES threads(thread_id) ON DELETE CASCADE
            )
        `);

        // 创建索引以提高查询性能
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status)`);
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at)`);
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at)`);
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_runs_thread_id ON runs(thread_id)`);
        await this.pool.query(`CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)`);

        this.isSetup = true;
    }

    async create(payload?: {
        metadata?: Metadata;
        threadId?: string;
        ifExists?: OnConflictBehavior;
        graphId?: string;
        supersteps?: Array<{ updates: Array<{ values: unknown; command?: Command; asNode: string }> }>;
    }): Promise<Thread<ValuesType>> {
        const threadId = payload?.threadId || crypto.randomUUID();

        // 检查线程是否已存在
        if (payload?.ifExists === 'raise') {
            const result = await this.pool.query('SELECT thread_id FROM threads WHERE thread_id = $1', [threadId]);
            if (result.rows.length > 0) {
                throw new Error(`Thread with ID ${threadId} already exists.`);
            }
        }

        const now = new Date();
        const metadata = payload?.metadata || {};
        const interrupts = {};

        const thread: Thread<ValuesType> = {
            thread_id: threadId,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            metadata,
            status: 'idle',
            values: null as unknown as ValuesType,
            interrupts,
        };

        // 插入到数据库
        await this.pool.query(
            `
            INSERT INTO threads (thread_id, created_at, updated_at, metadata, status, "values", interrupts)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
            [threadId, now, now, JSON.stringify(metadata), 'idle', null, JSON.stringify(interrupts)],
        );

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
        let sql = 'SELECT * FROM threads';
        const whereConditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        // 构建 WHERE 条件
        if (query?.status) {
            whereConditions.push(`status = $${paramIndex++}`);
            params.push(query.status);
        }

        if (query?.metadata) {
            for (const [key, value] of Object.entries(query.metadata)) {
                whereConditions.push(`metadata->$${paramIndex} = $${paramIndex + 1}`);
                params.push(key, JSON.stringify(value));
                paramIndex += 2;
            }
        }

        if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
        }

        // 添加排序
        if (query?.sortBy) {
            sql += ` ORDER BY ${query.sortBy}`;
            if (query.sortOrder === 'desc') {
                sql += ' DESC';
            } else {
                sql += ' ASC';
            }
        }

        // 添加分页
        if (query?.limit) {
            sql += ` LIMIT $${paramIndex++}`;
            params.push(query.limit);
            if (query?.offset) {
                sql += ` OFFSET $${paramIndex++}`;
                params.push(query.offset);
            }
        }

        const result = await this.pool.query(sql, params);

        return result.rows.map((row: ThreadRow) => ({
            thread_id: row.thread_id,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
            metadata: row.metadata,
            status: row.status as ThreadStatus,
            values: row.values || (null as unknown as ValuesType),
            interrupts: row.interrupts,
        }));
    }

    async get(threadId: string): Promise<Thread<ValuesType>> {
        const result = await this.pool.query('SELECT * FROM threads WHERE thread_id = $1', [threadId]);
        if (result.rows.length === 0) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }

        const row = result.rows[0] as ThreadRow;
        return {
            thread_id: row.thread_id,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
            metadata: row.metadata,
            status: row.status as ThreadStatus,
            values: row.values || (null as unknown as ValuesType),
            interrupts: row.interrupts,
        };
    }

    async set(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<void> {
        // 检查线程是否存在
        const existingThread = await this.pool.query('SELECT thread_id FROM threads WHERE thread_id = $1', [threadId]);
        if (existingThread.rows.length === 0) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (thread.metadata !== undefined) {
            updateFields.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(thread.metadata));
        }

        if (thread.status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            values.push(thread.status);
        }

        if (thread.values !== undefined) {
            updateFields.push(`"values" = $${paramIndex++}`);
            values.push(thread.values ? JSON.stringify(thread.values) : null);
        }

        if (thread.interrupts !== undefined) {
            updateFields.push(`interrupts = $${paramIndex++}`);
            values.push(JSON.stringify(thread.interrupts));
        }

        // 总是更新 updated_at
        updateFields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());

        if (updateFields.length > 0) {
            values.push(threadId);
            await this.pool.query(
                `
                UPDATE threads 
                SET ${updateFields.join(', ')} 
                WHERE thread_id = $${paramIndex}
            `,
                values,
            );
        }
    }

    async updateState(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<Pick<Config, 'configurable'>> {
        // 从数据库查询线程信息
        const result = await this.pool.query('SELECT * FROM threads WHERE thread_id = $1', [threadId]);
        if (result.rows.length === 0) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }

        const row = result.rows[0] as ThreadRow;
        const targetThread = {
            thread_id: row.thread_id,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
            metadata: row.metadata,
            status: row.status as ThreadStatus,
            values: row.values || (null as unknown as ValuesType),
            interrupts: row.interrupts,
        };

        if (targetThread.status === 'busy') {
            throw new Error(`Thread with ID ${threadId} is busy, can't update state.`);
        }

        if (!targetThread.metadata?.graph_id) {
            throw new Error(`Thread with ID ${threadId} has no graph_id.`);
        }
        const graphId = targetThread.metadata?.graph_id as string;
        const config = {
            configurable: {
                thread_id: threadId,
                graph_id: graphId,
            },
        };
        const graph = await getGraph(graphId, config);
        const nextConfig = await graph.updateState(config, thread.values);
        const graphState = await graph.getState(config);
        await this.set(threadId, { values: JSON.parse(serialiseAsDict(graphState.values)) as ValuesType });
        return nextConfig;
    }

    async delete(threadId: string): Promise<void> {
        const result = await this.pool.query('DELETE FROM threads WHERE thread_id = $1', [threadId]);
        if (result.rowCount === 0) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }
    }

    async createRun(threadId: string, assistantId: string, payload?: { metadata?: Metadata }): Promise<Run> {
        const runId = crypto.randomUUID();
        const now = new Date();
        const metadata = payload?.metadata ?? {};

        const run: Run = {
            run_id: runId,
            thread_id: threadId,
            assistant_id: assistantId,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
            status: 'pending',
            metadata,
            multitask_strategy: 'reject',
        };

        // 插入到数据库
        await this.pool.query(
            `
            INSERT INTO runs (run_id, thread_id, assistant_id, created_at, updated_at, status, metadata, multitask_strategy)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
            [runId, threadId, assistantId, now, now, 'pending', JSON.stringify(metadata), 'reject'],
        );

        return run;
    }

    async listRuns(
        threadId: string,
        options?: { limit?: number; offset?: number; status?: RunStatus },
    ): Promise<Run[]> {
        let sql = 'SELECT * FROM runs WHERE thread_id = $1';
        const params: any[] = [threadId];
        let paramIndex = 2;

        if (options?.status) {
            sql += ` AND status = $${paramIndex++}`;
            params.push(options.status);
        }

        sql += ' ORDER BY created_at DESC';

        if (options?.limit) {
            sql += ` LIMIT $${paramIndex++}`;
            params.push(options.limit);
            if (options?.offset) {
                sql += ` OFFSET $${paramIndex++}`;
                params.push(options.offset);
            }
        }

        const result = await this.pool.query(sql, params);

        return result.rows.map((row: RunRow) => ({
            run_id: row.run_id,
            thread_id: row.thread_id,
            assistant_id: row.assistant_id,
            created_at: new Date(row.created_at).toISOString(),
            updated_at: new Date(row.updated_at).toISOString(),
            status: row.status as RunStatus,
            metadata: row.metadata,
            multitask_strategy: row.multitask_strategy as 'reject',
        }));
    }

    async updateRun(runId: string, run: Partial<Run>): Promise<void> {
        // 检查运行是否存在
        const existingRun = await this.pool.query('SELECT run_id FROM runs WHERE run_id = $1', [runId]);
        if (existingRun.rows.length === 0) {
            throw new Error(`Run with ID ${runId} not found.`);
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (run.status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            values.push(run.status);
        }

        if (run.metadata !== undefined) {
            updateFields.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(run.metadata));
        }

        if (run.multitask_strategy !== undefined) {
            updateFields.push(`multitask_strategy = $${paramIndex++}`);
            values.push(run.multitask_strategy);
        }

        // 总是更新 updated_at
        updateFields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date());

        if (updateFields.length > 0) {
            values.push(runId);
            await this.pool.query(
                `
                UPDATE runs 
                SET ${updateFields.join(', ')} 
                WHERE run_id = $${paramIndex}
            `,
                values,
            );
        }
    }
}
