import { DatabaseType } from './type';

let Database: new (uri: string) => DatabaseType;
/** @ts-ignore */
if (globalThis.Bun) {
    console.log('Using Bun Sqlite, pid:', process.pid);
    const BunSqlite = await import('bun:sqlite');
    /** @ts-ignore */
    Database = BunSqlite.default;
} else {
    /** @ts-ignore */
    const CommonSqlite = await import('better-sqlite3');
    Database = CommonSqlite.default;
}

export { Database };
