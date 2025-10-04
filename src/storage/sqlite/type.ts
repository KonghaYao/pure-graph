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
