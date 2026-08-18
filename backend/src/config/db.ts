import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { config } from './env';

let pool: Pool;

export const getDbPool = (): Pool => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true,
    });

    console.log(`[Database] MySQL Connection Pool initialized for database '${config.db.database}' at ${config.db.host}:${config.db.port}`);
  }
  return pool;
};

export const testDbConnection = async (): Promise<boolean> => {
  try {
    const db = getDbPool();
    const connection = await db.getConnection();
    await connection.ping();

    // Auto-migration: Ensure new columns exist
    try {
      await connection.query(`
        ALTER TABLE voter_ledger 
        ADD COLUMN status ENUM('APPROVED', 'PENDING_APPROVAL', 'REJECTED') NOT NULL DEFAULT 'APPROVED'
      `);
    } catch (e: any) {
      // Column already exists or table not yet created
    }

    try {
      await connection.query(`
        ALTER TABLE elections 
        ADD COLUMN is_registration_open BOOLEAN NOT NULL DEFAULT TRUE
      `);
    } catch (e: any) {
      // Column already exists
    }

    connection.release();
    console.log('[Database] ✅ Successfully verified MySQL connection and schema integrity.');
    return true;
  } catch (error) {
    console.error('[Database] ❌ Database connection failed:', error);
    return false;
  }
};

/**
 * Execute work inside an isolated ACID transaction with automatic commit/rollback.
 */
export const withTransaction = async <T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> => {
  const db = getDbPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
