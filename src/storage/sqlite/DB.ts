export interface DatabaseType {
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
    transaction<T extends any[]>(fn: (...args: T) => void): (...args: T) => void;
}

interface Statement {
    run(...params: any[]): { changes: number; lastInsertRowid: number };
    get(...params: any[]): any;
    all(...params: any[]): any[];
}

let Database: new (uri: string) => DatabaseType;
/** @ts-ignore */
if (globalThis.Bun) {
    console.log('Using Bun Sqlite');
    const BunSqlite = await import('bun:sqlite');
    /** @ts-ignore */
    Database = BunSqlite.default;
} else {
    /** @ts-ignore */
    const CommonSqlite = await import('better-sqlite3');
    Database = CommonSqlite.default;
}

export { Database };
