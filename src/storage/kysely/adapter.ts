import { Kysely, sql, SqlBool, Expression } from 'kysely';
import { Database } from './types';

/**
 * 数据库适配器接口
 * 处理不同数据库间的差异，特别是时间类型和 JSON 查询
 */
export interface DatabaseAdapter {
    db: Kysely<Database>;
    /**
     * 将 Date 转换为数据库原生时间类型
     */
    dateToDb(date: Date): any;

    /**
     * 将数据库时间类型转换为 Date
     */
    dbToDate(dbValue: any): Date;

    /**
     * 将对象转换为数据库 JSON 类型
     */
    jsonToDb(obj: any): any;

    /**
     * 将数据库 JSON 类型转换为对象
     */
    dbToJson(dbValue: any): any;

    /**
     * 构建 JSON 字段查询表达式
     * @param field - JSON 字段名（如 'metadata'）
     * @param key - JSON 对象的键
     * @param value - 要匹配的值
     */
    buildJsonQuery(
        db: Kysely<Database>,
        field: 'metadata' | 'interrupts',
        key: string,
        value: any,
    ): Expression<SqlBool>;

    /**
     * 获取当前时间的数据库表示
     */
    now(): any;

    /**
     * 创建数据库表
     */
    createTables(db: Kysely<Database>): Promise<void>;

    /**
     * 创建索引
     */
    createIndexes(db: Kysely<Database>): Promise<void>;
}
