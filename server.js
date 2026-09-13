const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@campus.edu';

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'demo@ethereal.email',
        pass: process.env.SMTP_PASS || 'demopass'
    }
});

async function sendAdminNotificationEmail(complaint) {
    const subject = `[Smart Campus Alert] New Complaint Lodged: ${complaint.ticket_number} - ${complaint.title}`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2563eb; margin-top: 0;">Smart Campus Maintenance Portal</h2>
            <p style="font-size: 16px; color: #1e293b;">A new facility complaint has been lodged and routed to administrative review.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                    <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Ticket ID:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #2563eb; font-weight: bold;">${complaint.ticket_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Urgency:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-weight: bold; color: ${complaint.urgency === 'urgent' ? '#dc2626' : '#d97706'};">${complaint.urgency}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Category:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${complaint.category}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Location:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${complaint.location} (${complaint.room_number})</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Reported By:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${complaint.student_name} (${complaint.email})</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Title:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${complaint.title}</td>
                </tr>
            </table>

            <div style="margin-top: 15px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 4px;">
                <strong>Detailed Description:</strong>
                <p style="margin: 5px 0 0 0; color: #475569;">${complaint.description}</p>
            </div>
            
            <p style="font-size: 12px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                Sent automatically to Administrative Email ID: <strong>${ADMIN_EMAIL}</strong>.
            </p>
        </div>
    `;

    console.log(`\n======================================================`);
    console.log(`[ADMINISTRATIVE EMAIL SYSTEM] Notification Dispatched`);
    console.log(`Recipient (Admin Email): ${ADMIN_EMAIL}`);
    console.log(`Subject: ${subject}`);
    console.log(`Ticket: ${complaint.ticket_number} | Urgency: ${complaint.urgency}`);
    console.log(`Reporter: ${complaint.student_name} <${complaint.email}>`);
    console.log(`======================================================\n`);

    try {
        if (process.env.SMTP_HOST) {
            await transporter.sendMail({
                from: '"Smart Campus Portal" <noreply@campus.edu>',
                to: ADMIN_EMAIL,
                subject: subject,
                html: htmlContent
            });
            console.log(`[SMTP CONFIRMED] Email delivered to ${ADMIN_EMAIL}`);
        }
    } catch (err) {
        console.error(`[SMTP ERROR] Could not deliver email to SMTP server:`, err.message);
    }
}

// Telegram Bot Configuration
const https = require('https');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

async function sendTelegramNotification(complaint) {
    const token = process.env.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;

    const urgencyEmoji = complaint.urgency === 'urgent' ? '🔴 URGENT' : (complaint.urgency === 'high' ? '🟠 HIGH' : '🟡 MEDIUM');

    const message = `🚨 <b>NEW CAMPUS MAINTENANCE COMPLAINT</b> 🚨\n\n` +
        `<b>Ticket ID:</b> <code>${complaint.ticket_number}</code>\n` +
        `<b>Urgency:</b> ${urgencyEmoji}\n` +
        `<b>Category:</b> ${complaint.category}\n` +
        `<b>Location:</b> ${complaint.location} (${complaint.room_number})\n` +
        `<b>Reported By:</b> ${complaint.student_name} (${complaint.email})\n` +
        `<b>Title:</b> ${complaint.title}\n\n` +
        `<b>Description:</b>\n<i>${complaint.description}</i>`;

    console.log(`\n======================================================`);
    console.log(`[TELEGRAM NOTIFICATION SYSTEM]`);
    if (token && chatId) {
        console.log(`Sending live alert to Telegram Chat/Channel ID: ${chatId}`);
    } else {
        console.log(`Telegram Bot Token / Chat ID not set yet. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to receive instant Telegram notifications!`);
    }
    console.log(`======================================================\n`);

    if (!token || !chatId) return;

    try {
        const postData = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });

        const req = https.request(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`[TELEGRAM API SUCCESS] Message dispatched to Telegram channel`);
            });
        });

        req.on('error', (e) => {
            console.error(`[TELEGRAM API ERROR] Failed to send message:`, e.message);
        });

        req.write(postData);
        req.end();
    } catch (err) {
        console.error(`[TELEGRAM ERROR]`, err);
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(__dirname));

// Explicit route handler for style.css (ensures style.css is served on Vercel & serverless platforms)
app.get('/style.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'style.css'));
});

// In-memory fallback dataset for lost/found items
let memoryItems = [
    {
        id: 1,
        report_type: 'found',
        title: 'Apple AirPods',
        category: 'electronics',
        location: 'library',
        date_reported: '2026-12-23',
        contact_info: 'lib.desk@campus.edu',
        student_name: 'Library Staff',
        student_id: 'STAFF-01',
        image_url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=150&q=80',
        description: 'Found on 2nd floor study table'
    },
    {
        id: 2,
        report_type: 'found',
        title: 'Key',
        category: 'accessories',
        location: 'library',
        date_reported: '2026-12-23',
        contact_info: 'security@campus.edu',
        student_name: 'Campus Guard',
        student_id: 'SEC-12',
        image_url: 'https://images.unsplash.com/photo-1584646098378-0874589d76b1?auto=format&fit=crop&w=150&q=80',
        description: 'Single key with blue keychain'
    },
    {
        id: 3,
        report_type: 'found',
        title: 'University ID',
        category: 'id',
        location: 'library',
        date_reported: '2026-12-23',
        contact_info: 'helpdesk@campus.edu',
        student_name: 'Admin Desk',
        student_id: 'ADM-04',
        image_url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=150&q=80',
        description: 'Student ID card found near entrance'
    },
    {
        id: 4,
        report_type: 'lost',
        title: 'Phone case',
        category: 'electronics',
        location: 'cafeteria',
        date_reported: '2026-12-23',
        contact_info: '9876543210',
        student_name: 'John',
        student_id: 'ST-991',
        image_url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=150&q=80',
        description: 'Red silicone case'
    },
    {
        id: 5,
        report_type: 'lost',
        title: 'Brown Leather Wallet',
        category: 'bags',
        location: 'cafeteria',
        date_reported: '2026-12-23',
        contact_info: '9876543211',
        student_name: 'Sarah',
        student_id: 'ST-992',
        image_url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=150&q=80',
        description: 'Contains ID and cash'
    },
    {
        id: 6,
        report_type: 'lost',
        title: 'Leather Wallet',
        category: 'bags',
        location: 'cafeteria',
        date_reported: '2026-12-23',
        contact_info: '9876543212',
        student_name: 'Mike',
        student_id: 'ST-993',
        image_url: 'https://images.unsplash.com/photo-1517254798697-0775855237da?auto=format&fit=crop&w=150&q=80',
        description: 'Black slim wallet'
    }
];

// API Endpoint to get all items
app.get('/api/items', async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT * FROM items ORDER BY created_at DESC LIMIT 50');
        if (rows && rows.length > 0) return res.json(rows);
        res.json(memoryItems);
    } catch (error) {
        res.json(memoryItems);
    }
});

// API Endpoint to submit a new item
app.post('/api/items', async (req, res) => {
    try {
        const {
            report_type,
            title,
            category,
            location,
            date_reported,
            contact_info,
            student_name,
            student_id,
            image_url,
            description
        } = req.body;

        const newItem = {
            id: memoryItems.length + 1,
            report_type,
            title,
            category,
            location,
            date_reported: date_reported || new Date().toISOString().split('T')[0],
            contact_info,
            student_name: student_name || null,
            student_id: student_id || null,
            image_url: image_url || null,
            description: description || null
        };

        try {
            const query = `
                INSERT INTO items (
                    report_type, title, category, location, date_reported, 
                    contact_info, student_name, student_id, image_url, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
                report_type, title, category, location, date_reported, 
                contact_info, student_name || null, student_id || null, 
                image_url || null, description || null
            ];
            await db.pool.query(query, values);
        } catch (dbErr) {
            console.log("Saving item to memory store");
        }

        memoryItems.unshift(newItem);
        res.status(201).json({ message: 'Item reported successfully', id: newItem.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit the item report' });
    }
});

// In-memory fallback dataset for complaints
let memoryComplaints = [
    {
        id: 1,
        ticket_number: '#CMP-1045',
        student_name: 'Alex Johnson',
        email: 'alex.j@campus.edu',
        category: 'AC / Ventilation',
        urgency: 'urgent',
        location: 'Classroom Block',
        room_number: 'Room 204',
        title: 'Classroom Block B AC Not Cooling',
        description: 'AC unit in Room 204 is throwing warm air and making unusual noise. Needs urgent technician attention.',
        status: 'in_progress',
        date_reported: '2026-12-23'
    },
    {
        id: 2,
        ticket_number: '#CMP-1041',
        student_name: 'Sam Wilson',
        email: 'sam.w@campus.edu',
        category: 'Cleaning / Sanitation',
        urgency: 'medium',
        location: 'Library',
        room_number: '2nd Floor',
        title: 'Restroom Sanitation Issue',
        description: '2nd Floor Library Restroom requires cleaning and soap dispenser refill.',
        status: 'investigating',
        date_reported: '2026-12-22'
    },
    {
        id: 3,
        ticket_number: '#CMP-1038',
        student_name: 'Campus Admin',
        email: 'admin@campus.edu',
        category: 'IT / Wi-Fi',
        urgency: 'low',
        location: 'Cafeteria',
        room_number: 'East Wing',
        title: 'Wi-Fi Access Point Offline',
        description: 'Router in Cafeteria East Wing was down. IT replaced power adapter.',
        status: 'resolved',
        date_reported: '2026-12-20'
    }
];

let nextTicketId = 1046;

// API Endpoint to get all complaints
app.get('/api/complaints', async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT * FROM complaints ORDER BY id DESC');
        if (rows && rows.length > 0) {
            return res.json(rows);
        }
        res.json(memoryComplaints);
    } catch (error) {
        // Fallback to memory store if DB is offline or table empty
        res.json(memoryComplaints);
    }
});

// API Endpoint to submit a new complaint
app.post('/api/complaints', async (req, res) => {
    try {
        const {
            student_name,
            email,
            category,
            urgency,
            location,
            room_number,
            title,
            description
        } = req.body;

        const ticket_number = `#CMP-${nextTicketId++}`;
        const date_reported = new Date().toISOString().split('T')[0];
        const status = 'in_progress';

        const newComplaint = {
            id: memoryComplaints.length + 1,
            ticket_number,
            student_name: student_name || 'Anonymous Student',
            email,
            category,
            urgency,
            location,
            room_number,
            title,
            description,
            status,
            date_reported
        };

        try {
            const query = `
                INSERT INTO complaints (
                    ticket_number, student_name, email, category, urgency,
                    location, room_number, title, description, status, date_reported
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
                ticket_number, student_name, email, category, urgency,
                location, room_number, title, description, status, date_reported
            ];
            await db.pool.query(query, values);
        } catch (dbErr) {
            console.log("Saving complaint to in-memory store (MySQL offline)");
        }

        memoryComplaints.unshift(newComplaint);
        
        // Dispatch administrative alerts (Email + Telegram Bot)
        sendAdminNotificationEmail(newComplaint);
        sendTelegramNotification(newComplaint);

        res.status(201).json({ 
            message: 'Complaint lodged successfully and dispatched to administrative email ID.', 
            admin_email: ADMIN_EMAIL,
            complaint: newComplaint 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to lodge complaint' });
    }
});

// Root route handler for index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server and initialize DB if running directly
if (require.main === module || process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        await db.initDb();
    });
}

// Export app for Vercel & serverless environments
module.exports = app;

