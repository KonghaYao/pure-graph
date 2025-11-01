import { Kysely, sql, SqlBool, Expression, PostgresDialect } from 'kysely';
import { DatabaseAdapter } from './adapter';
import { Database } from './types';
import { Pool } from 'pg';

/**
 * PostgreSQL 适配器
 * - 时间类型：原生 TIMESTAMP
 * - JSON 类型：JSONB
 * - JSON 查询：使用 -> 和 ->> 操作符
 */
export class PostgresAdapter implements DatabaseAdapter {
    db: Kysely<Database>;
    constructor(public pool: Pool) {
        this.db = new Kysely<Database>({
            dialect: new PostgresDialect({
                pool: pool,
            }),
        });
    }
    dateToDb(date: Date): Date {
        // PostgreSQL 支持原生 Date 对象
        return date;
    }

    dbToDate(dbValue: any): Date {
        // PostgreSQL 返回的时间已经是 Date 对象或可以直接转换
        return dbValue instanceof Date ? dbValue : new Date(dbValue);
    }

    jsonToDb(obj: any): any {
        // PostgreSQL 的 kysely 驱动会自动处理 JSON 序列化
        return obj;
    }

    dbToJson(dbValue: any): any {
        // PostgreSQL 的 kysely 驱动会自动处理 JSON 反序列化
        return dbValue;
    }

    buildJsonQuery(
        db: Kysely<Database>,
        field: 'metadata' | 'interrupts',
        key: string,
        value: any,
    ): Expression<SqlBool> {
        // PostgreSQL 使用 -> 操作符访问 JSONB 字段
        // 注意：-> 返回 JSONB，->> 返回 text
        return sql<boolean>`${sql.ref(field)}->>${sql.lit(key)} = ${sql.lit(JSON.stringify(value))}`;
    }

    now(): Date {
        return new Date();
    }

    async createTables(db: Kysely<Database>): Promise<void> {
        // 创建 threads 表
        await sql`
            CREATE TABLE IF NOT EXISTS threads (
                thread_id TEXT PRIMARY KEY,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                metadata JSONB NOT NULL DEFAULT '{}',
                status TEXT NOT NULL DEFAULT 'idle',
                values JSONB,
                interrupts JSONB NOT NULL DEFAULT '{}'
            )
        `.execute(db);

        // 创建 runs 表
        await sql`
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
        `.execute(db);
    }

    async createIndexes(db: Kysely<Database>): Promise<void> {
        await sql`CREATE INDEX IF NOT EXISTS idx_threads_status ON threads(status)`.execute(db);
        await sql`CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at)`.execute(db);
        await sql`CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at)`.execute(db);
        await sql`CREATE INDEX IF NOT EXISTS idx_runs_thread_id ON runs(thread_id)`.execute(db);
        await sql`CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status)`.execute(db);
    }
}
