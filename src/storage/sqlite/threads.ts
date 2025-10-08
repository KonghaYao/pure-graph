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
import type { SqliteSaver } from './checkpoint.js';
import type { DatabaseType } from './type.js';
import { getGraph } from '../../utils/getGraph.js';
import { serialiseAsDict } from '../../graph/stream.js';
interface ThreadRow {
    thread_id: string;
    created_at: string;
    updated_at: string;
    metadata: string;
    status: string;
    values: string;
    interrupts: string;
}

interface RunRow {
    run_id: string;
    thread_id: string;
    assistant_id: string;
    created_at: string;
    updated_at: string;
    status: string;
    metadata: string;
    multitask_strategy: string;
}

export class SQLiteThreadsManager<ValuesType = unknown> implements BaseThreadsManager<ValuesType> {
    db: DatabaseType;
    private isSetup: boolean = false;

    constructor(checkpointer: SqliteSaver) {
        this.db = checkpointer.db;
    }

    async setup() {
        if (this.isSetup) {
            return;
        }

        // 创建 threads 表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS threads (
                thread_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                metadata TEXT NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'idle',
                [values] TEXT,
                interrupts TEXT NOT NULL DEFAULT '{}'
            )
        `);

        // 创建 runs 表
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                thread_id TEXT NOT NULL,
                assistant_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                metadata TEXT NOT NULL DEFAULT '{}',
                multitask_strategy TEXT NOT NULL DEFAULT 'reject',
                FOREIGN KEY (thread_id) REFERENCES threads(thread_id) ON DELETE CASCADE
            )
        `);

        // 创建索引以提高查询性能
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_thread_id ON runs(thread_id)`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)`);

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
            const existingThread = this.db.prepare('SELECT thread_id FROM threads WHERE thread_id = ?').get(threadId);
            if (existingThread) {
                throw new Error(`Thread with ID ${threadId} already exists.`);
            }
        }

        const now = new Date().toISOString();
        const metadata = JSON.stringify(payload?.metadata || {});
        const interrupts = JSON.stringify({});

        const thread: Thread<ValuesType> = {
            thread_id: threadId,
            created_at: now,
            updated_at: now,
            metadata: payload?.metadata || {},
            status: 'idle',
            values: null as unknown as ValuesType,
            interrupts: {},
        };

        // 插入到数据库
        this.db
            .prepare(
                `
            INSERT INTO threads (thread_id, created_at, updated_at, metadata, status, [values], interrupts)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
            )
            .run(threadId, now, now, metadata, 'idle', null, interrupts);

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

        // 构建 WHERE 条件
        if (query?.status) {
            whereConditions.push('status = ?');
            params.push(query.status);
        }

        if (query?.metadata) {
            for (const [key, value] of Object.entries(query.metadata)) {
                whereConditions.push(`json_extract(metadata, '$.${key}') = ?`);
                params.push(JSON.stringify(value));
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
            sql += ` LIMIT ${query.limit}`;
            if (query?.offset) {
                sql += ` OFFSET ${query.offset}`;
            }
        }

        const rows = this.db.prepare(sql).all(...params) as ThreadRow[];

        return rows.map((row) => ({
            thread_id: row.thread_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            metadata: JSON.parse(row.metadata),
            status: row.status as ThreadStatus,
            values: row.values ? JSON.parse(row.values) : (null as unknown as ValuesType),
            interrupts: JSON.parse(row.interrupts),
        }));
    }

    async get(threadId: string): Promise<Thread<ValuesType>> {
        const row = this.db.prepare('SELECT * FROM threads WHERE thread_id = ?').get(threadId) as ThreadRow;
        if (!row) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }

        return {
            thread_id: row.thread_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            metadata: JSON.parse(row.metadata),
            status: row.status as ThreadStatus,
            values: row.values ? JSON.parse(row.values) : (null as unknown as ValuesType),
            interrupts: JSON.parse(row.interrupts),
        };
    }
    async set(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<void> {
        // 检查线程是否存在
        const existingThread = this.db.prepare('SELECT thread_id FROM threads WHERE thread_id = ?').get(threadId);
        if (!existingThread) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }

        const updateFields: string[] = [];
        const values: any[] = [];

        if (thread.metadata !== undefined) {
            updateFields.push('metadata = ?');
            values.push(JSON.stringify(thread.metadata));
        }

        if (thread.status !== undefined) {
            updateFields.push('status = ?');
            values.push(thread.status);
        }

        if (thread.values !== undefined) {
            updateFields.push('[values] = ?');
            values.push(thread.values ? JSON.stringify(thread.values) : null);
        }

        if (thread.interrupts !== undefined) {
            updateFields.push('interrupts = ?');
            values.push(JSON.stringify(thread.interrupts));
        }

        // 总是更新 updated_at
        updateFields.push('updated_at = ?');
        values.push(new Date().toISOString());

        if (updateFields.length > 0) {
            values.push(threadId);
            this.db
                .prepare(
                    `
                UPDATE threads 
                SET ${updateFields.join(', ')} 
                WHERE thread_id = ?
            `,
                )
                .run(...values);
        }
    }
    async updateState(threadId: string, thread: Partial<Thread<ValuesType>>): Promise<Pick<Config, 'configurable'>> {
        // 从数据库查询线程信息
        const row = this.db.prepare('SELECT * FROM threads WHERE thread_id = ?').get(threadId) as ThreadRow;
        if (!row) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }

        const targetThread = {
            thread_id: row.thread_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            metadata: JSON.parse(row.metadata),
            status: row.status as ThreadStatus,
            values: row.values ? JSON.parse(row.values) : (null as unknown as ValuesType),
            interrupts: JSON.parse(row.interrupts),
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
        const result = this.db.prepare('DELETE FROM threads WHERE thread_id = ?').run(threadId);
        if (result.changes === 0) {
            throw new Error(`Thread with ID ${threadId} not found.`);
        }
    }
    async createRun(threadId: string, assistantId: string, payload?: { metadata?: Metadata }): Promise<Run> {
        const runId = crypto.randomUUID();
        const now = new Date().toISOString();
        const metadata = JSON.stringify(payload?.metadata ?? {});

        const run: Run = {
            run_id: runId,
            thread_id: threadId,
            assistant_id: assistantId,
            created_at: now,
            updated_at: now,
            status: 'pending',
            metadata: payload?.metadata ?? {},
            multitask_strategy: 'reject',
        };

        // 插入到数据库
        this.db
            .prepare(
                `
            INSERT INTO runs (run_id, thread_id, assistant_id, created_at, updated_at, status, metadata, multitask_strategy)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
            )
            .run(runId, threadId, assistantId, now, now, 'pending', metadata, 'reject');

        return run;
    }
    async listRuns(
        threadId: string,
        options?: { limit?: number; offset?: number; status?: RunStatus },
    ): Promise<Run[]> {
        let sql = 'SELECT * FROM runs WHERE thread_id = ?';
        const params: any[] = [threadId];

        if (options?.status) {
            sql += ' AND status = ?';
            params.push(options.status);
        }

        sql += ' ORDER BY created_at DESC';

        if (options?.limit) {
            sql += ` LIMIT ${options.limit}`;
            if (options?.offset) {
                sql += ` OFFSET ${options.offset}`;
            }
        }

        const rows = this.db.prepare(sql).all(...params) as RunRow[];

        return rows.map((row) => ({
            run_id: row.run_id,
            thread_id: row.thread_id,
            assistant_id: row.assistant_id,
            created_at: row.created_at,
            updated_at: row.updated_at,
            status: row.status as RunStatus,
            metadata: JSON.parse(row.metadata),
            multitask_strategy: row.multitask_strategy as 'reject',
        }));
    }
    async updateRun(runId: string, run: Partial<Run>): Promise<void> {
        // 检查运行是否存在
        const existingRun = this.db.prepare('SELECT run_id FROM runs WHERE run_id = ?').get(runId);
        if (!existingRun) {
            throw new Error(`Run with ID ${runId} not found.`);
        }

        const updateFields: string[] = [];
        const values: any[] = [];

        if (run.status !== undefined) {
            updateFields.push('status = ?');
            values.push(run.status);
        }

        if (run.metadata !== undefined) {
            updateFields.push('metadata = ?');
            values.push(JSON.stringify(run.metadata));
        }

        if (run.multitask_strategy !== undefined) {
            updateFields.push('multitask_strategy = ?');
            values.push(run.multitask_strategy);
        }

        // 总是更新 updated_at
        updateFields.push('updated_at = ?');
        values.push(new Date().toISOString());

        if (updateFields.length > 0) {
            values.push(runId);
            this.db
                .prepare(
                    `
                UPDATE runs 
                SET ${updateFields.join(', ')} 
                WHERE run_id = ?
            `,
                )
                .run(...values);
        }
    }
}
