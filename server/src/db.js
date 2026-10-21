import mysql from 'mysql2/promise';

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  timezone: 'Z',
  dateStrings: ['DATE'],
};

export const pool = mysql.createPool({
  ...dbConfig,
  database: process.env.DB_NAME || 'crm',
  connectionLimit: 10,
});

pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
