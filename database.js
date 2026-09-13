/**
 * database.js
 * Supports two modes:
 *  1. PostgreSQL (Supabase / Neon) — set DATABASE_URL environment variable
 *  2. MySQL (local / Railway)      — set MYSQL_HOST, MYSQL_USER, MYSQL_PASS, MYSQL_DB
 *  3. Memory-only fallback         — if neither is configured (safe on Vercel with no DB)
 */

let pool = null;
let dbType = 'memory'; // 'pg' | 'mysql' | 'memory'

// ─── Try PostgreSQL (Supabase / Neon) ────────────────────────────────────────
if (process.env.DATABASE_URL) {
    try {
        const { Pool } = require('pg');
        const pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false } // required for Supabase/Neon
        });
        pool = pgPool;
        dbType = 'pg';
        console.log('[DB] PostgreSQL (Supabase/Neon) pool configured via DATABASE_URL.');
    } catch (err) {
        console.warn('[DB] Could not set up PostgreSQL pool:', err.message);
    }
}

// ─── Try MySQL fallback (Railway / local) ────────────────────────────────────
if (!pool && (process.env.MYSQL_HOST || process.env.DB_HOST)) {
    try {
        const mysql = require('mysql2');
        const mysqlPool = mysql.createPool({
            host:     process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
            user:     process.env.MYSQL_USER || process.env.DB_USER || 'root',
            password: process.env.MYSQL_PASS || process.env.DB_PASS || '',
            database: process.env.MYSQL_DB   || process.env.DB_NAME || 'smart_campus',
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0,
            connectTimeout: 5000
        });
        pool = mysqlPool.promise();
        dbType = 'mysql';
        console.log('[DB] MySQL pool configured.');
    } catch (err) {
        console.warn('[DB] Could not set up MySQL pool:', err.message);
    }
}

if (dbType === 'memory') {
    console.warn('[DB] No DATABASE_URL or MYSQL_HOST set. Running in memory-only mode.');
}

// ─── Unified query helper ─────────────────────────────────────────────────────
// Wraps pg & mysql2 into one interface. Always returns { rows }.
async function query(sql, params = []) {
    if (!pool) throw new Error('No database pool available');

    if (dbType === 'pg') {
        // pg uses $1, $2 placeholders — convert from ? style
        let i = 0;
        const pgSql = sql.replace(/\?/g, () => `$${++i}`);
        const result = await pool.query(pgSql, params);
        return { rows: result.rows };
    } else {
        // mysql2 returns [rows, fields]
        const [rows] = await pool.query(sql, params);
        return { rows };
    }
}

// ─── Initialize tables ────────────────────────────────────────────────────────
async function initDb() {
    if (!pool) {
        console.warn('[DB] Skipping initDb — running in memory-only mode.');
        return;
    }

    try {
        if (dbType === 'pg') {
            // PostgreSQL schemas (Supabase / Neon)
            await query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(150) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS items (
                    id SERIAL PRIMARY KEY,
                    report_type VARCHAR(10) NOT NULL CHECK (report_type IN ('lost','found')),
                    title VARCHAR(150) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    location VARCHAR(50) NOT NULL,
                    date_reported DATE NOT NULL,
                    contact_info VARCHAR(150) NOT NULL,
                    student_name VARCHAR(150),
                    student_id VARCHAR(50),
                    image_url TEXT,
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS complaints (
                    id SERIAL PRIMARY KEY,
                    ticket_number VARCHAR(20) NOT NULL UNIQUE,
                    student_name VARCHAR(150) NOT NULL,
                    email VARCHAR(150) NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    urgency VARCHAR(50) NOT NULL,
                    location VARCHAR(100) NOT NULL,
                    room_number VARCHAR(100) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'in_progress',
                    date_reported DATE NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `);

        } else {
            // MySQL schemas (Railway / local)
            await query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(150) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    report_type ENUM('lost','found') NOT NULL,
                    title VARCHAR(150) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    location VARCHAR(50) NOT NULL,
                    date_reported DATE NOT NULL,
                    contact_info VARCHAR(150) NOT NULL,
                    student_name VARCHAR(150),
                    student_id VARCHAR(50),
                    image_url TEXT,
                    description TEXT,
                    status ENUM('active','resolved') DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            `);

            await query(`
                CREATE TABLE IF NOT EXISTS complaints (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    ticket_number VARCHAR(20) NOT NULL UNIQUE,
                    student_name VARCHAR(150) NOT NULL,
                    email VARCHAR(150) NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    urgency VARCHAR(50) NOT NULL,
                    location VARCHAR(100) NOT NULL,
                    room_number VARCHAR(100) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'in_progress',
                    date_reported DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            `);
        }

        console.log(`[DB] Tables verified/created (${dbType}).`);
    } catch (error) {
        console.error('[DB] initDb error:', error.message);
    }
}

module.exports = { pool, query, initDb, dbType };
