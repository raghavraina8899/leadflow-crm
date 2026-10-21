import fs from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';
import { seed } from './seed.js';

const dbName = process.env.DB_NAME || 'crm';
const reset = process.argv.includes('--reset');

const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });

try {
  await conn.query("SET time_zone = '+00:00'");
  if (reset) await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${dbName}\``);
  await conn.query(await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8'));

  const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM users');
  if (count > 0) {
    console.log('Schema is up to date. Existing data left untouched (run with --reset to reseed).');
  } else {
    await conn.beginTransaction();
    const users = await seed(conn);
    await conn.commit();
    console.log(`Database "${dbName}" is ready with demo data. Sign in with:`);
    for (const u of users) console.log(`  ${u.role.padEnd(5)}  ${u.email.padEnd(16)}  ${u.password}`);
  }
} finally {
  await conn.end();
}
