const mysql = require('mysql2');

// Create pool safely — will be null if MySQL env vars are missing
let promisePool = null;

try {
    const host = process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
    const user = process.env.MYSQL_USER || process.env.DB_USER || 'root';
    const password = process.env.MYSQL_PASS || process.env.DB_PASS || '';
    const database = process.env.MYSQL_DB || process.env.DB_NAME || 'smart_campus';

    const pool = mysql.createPool({
        host,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 5000
    });

    promisePool = pool.promise();
    console.log('[DB] MySQL pool configured. Will attempt connection on first query.');
} catch (err) {
    console.warn('[DB] Could not configure MySQL pool. Running in memory-only mode:', err.message);
    promisePool = null;
}

// Function to initialize the database
async function initDb() {
    if (!promisePool) {
        console.warn('[DB] Skipping initDb — no MySQL pool available. Running in memory-only mode.');
        return;
    }
    try {
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                report_type ENUM('lost', 'found') NOT NULL,
                title VARCHAR(150) NOT NULL,
                category ENUM('electronics', 'accessories', 'id', 'bags', 'other') NOT NULL,
                location ENUM('library', 'cafeteria', 'sports', 'classroom', 'hostels') NOT NULL,
                date_reported DATE NOT NULL,
                contact_info VARCHAR(150) NOT NULL,
                student_name VARCHAR(150),
                student_id VARCHAR(50),
                image_url TEXT,
                description TEXT,
                status ENUM('active', 'resolved') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        await promisePool.query(`
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
        console.log('[DB] Database tables verified/created successfully.');
    } catch (error) {
        console.error('[DB] Database initialization failed. Running in memory-only mode.', error.message);
    }
}

module.exports = {
    pool: promisePool,
    initDb
};
