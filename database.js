const mysql = require('mysql2');

// Configure MySQL connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // Change to your MySQL username
    password: '', // Change to your MySQL password
    database: 'smart_campus', // We will create this database if it doesn't exist
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// A promise wrapper for the pool
const promisePool = pool.promise();

// Function to initialize the database
async function initDb() {
    try {
        // Create database if not exists using a raw connection first
        const rawConnection = await mysql.createConnection({
            host: 'localhost',
            user: 'root', // Change as needed
            password: '' // Change as needed
        }).promise();
        
        await rawConnection.query(`CREATE DATABASE IF NOT EXISTS smart_campus;`);
        await rawConnection.end();

        console.log("Connected to MySQL Database: smart_campus");
        
        // Execute the schema to ensure tables exist
        // Note: For ENUMs to work properly, we need to create them. 
        // MySQL does not use CREATE TYPE ... AS ENUM. Instead, ENUMs are defined in the column.
        // Let's create the users table
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Let's create the items table (adapting the ENUMs for MySQL)
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        // Create complaints table
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
        console.log("Database tables verified/created successfully.");
    } catch (error) {
        console.error("Database initialization failed. Please ensure MySQL is running on localhost and credentials (root / empty password) are correct.", error);
    }
}

module.exports = {
    pool: promisePool,
    initDb
};
