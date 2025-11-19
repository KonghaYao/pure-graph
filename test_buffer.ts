import { Database } from 'bun:sqlite';

const db = new Database(':memory:');
db.exec('CREATE TABLE test (data BLOB)');

const stmt = db.prepare('INSERT INTO test (data) VALUES (?)');

console.log('Testing Uint8Array...');
try {
    stmt.run(new Uint8Array([1, 2, 3]));
    console.log('✓ Success with Uint8Array');
} catch (e: any) {
    console.log('✗ Failed with Uint8Array:', e.message);
}

console.log('\nTesting Buffer...');
try {
    stmt.run(Buffer.from('test'));
    console.log('✓ Success with Buffer');
} catch (e: any) {
    console.log('✗ Failed with Buffer:', e.message);
}

console.log('\nTesting Buffer.from with array...');
try {
    stmt.run(Buffer.from([1, 2, 3]));
    console.log('✓ Success with Buffer.from([])');
} catch (e: any) {
    console.log('✗ Failed with Buffer.from([]):', e.message);
}

