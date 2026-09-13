-- schema.sql
-- Database schema for Smart Campus Lost & Found

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE report_type_enum AS ENUM ('lost', 'found');
CREATE TYPE category_enum AS ENUM ('electronics', 'accessories', 'id', 'bags', 'other');
CREATE TYPE location_enum AS ENUM ('library', 'cafeteria', 'sports', 'classroom', 'hostels');
CREATE TYPE status_enum AS ENUM ('active', 'resolved');

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    report_type report_type_enum NOT NULL,
    title VARCHAR(150) NOT NULL,
    category category_enum NOT NULL,
    location location_enum NOT NULL,
    date_reported DATE NOT NULL,
    contact_info VARCHAR(150) NOT NULL,
    student_name VARCHAR(150),
    student_id VARCHAR(50),
    image_url TEXT,
    description TEXT,
    status status_enum DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

