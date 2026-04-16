const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'users.json');
const CHAT_FILE = path.join(__dirname, 'chatHistory.json');

// Load database
function loadDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.log('Database file not found or invalid, initializing empty database.');
        return { users: [], resetTokens: {} };
    }
}

// Save database
function saveDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving database:', err);
    }
}

// Load chat history
function loadChatHistory() {
    try {
        const data = fs.readFileSync(CHAT_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.log('Chat history file not found, initializing empty.');
        return [];
    }
}

// Save chat history
function saveChatHistory(history) {
    try {
        fs.writeFileSync(CHAT_FILE, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error('Error saving chat history:', err);
    }
}

// Initialize database
let db = loadDB();
let users = db.users;
let resetTokens = db.resetTokens;

// Initialize chat history
let chatHistory = loadChatHistory();

function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            callback(JSON.parse(body));
        } catch (e) {
            callback({});
        }
    });
}

function sendResponse(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API routes
    if (pathname === '/api/register' && req.method === 'POST') {
        parseBody(req, (body) => {
            const username = (body.username || '').trim();
            const email = (body.email || '').trim();
            const password = (body.password || '').trim();
            if (!username || !email || !password) {
                return sendResponse(res, 400, { message: 'All fields are required.' });
            }
            const normalizedUsername = username.toLowerCase();
            const normalizedEmail = email.toLowerCase();
            const existingUser = users.find(u => u.username.toLowerCase() === normalizedUsername || u.email.toLowerCase() === normalizedEmail);
            if (existingUser) {
                return sendResponse(res, 400, { message: 'User with that username or email already exists.' });
            }
            const newUser = { id: Date.now(), username: normalizedUsername, email: normalizedEmail, password };
            users.push(newUser);
            saveDB({ users, resetTokens });
            sendResponse(res, 201, { message: 'Account created successfully.', user: { id: newUser.id, username: newUser.username, email: newUser.email } });
        });
    } else if (pathname === '/api/login' && req.method === 'POST') {
        parseBody(req, (body) => {
            const username = (body.username || '').trim();
            const password = (body.password || '').trim();
            const normalizedUsername = username.toLowerCase();
            const user = users.find(u => u.username.toLowerCase() === normalizedUsername || u.email === normalizedUsername);
            if (!user || user.password !== password) {
                return sendResponse(res, 401, { message: 'Invalid username or password.' });
            }
            sendResponse(res, 200, { message: 'Login successful.', user: { id: user.id, username: user.username, email: user.email } });
        });
    } else if (pathname === '/api/forgot' && req.method === 'POST') {
        parseBody(req, (body) => {
            const email = (body.email || '').trim().toLowerCase();
            const user = users.find(u => u.email.toLowerCase() === email);
            if (!user) {
                return sendResponse(res, 404, { message: 'No account registered with that email.' });
            }
            const token = Math.floor(100000 + Math.random() * 900000).toString();
            resetTokens[email] = token;
            saveDB({ users, resetTokens });
            sendResponse(res, 200, { message: 'Reset token generated.', token });
        });
    } else if (pathname === '/api/reset' && req.method === 'POST') {
        parseBody(req, (body) => {
            const email = (body.email || '').trim().toLowerCase();
            const { token, newPassword } = body;
            if (!newPassword) {
                return sendResponse(res, 400, { message: 'New password is required.' });
            }
            if (resetTokens[email] !== token) {
                return sendResponse(res, 400, { message: 'Invalid reset token.' });
            }
            const user = users.find(u => u.email.toLowerCase() === email);
            if (!user) {
                return sendResponse(res, 404, { message: 'User not found.' });
            }
            user.password = newPassword;
            delete resetTokens[email];
            saveDB({ users, resetTokens });
            sendResponse(res, 200, { message: 'Password reset successfully.' });
        });
    } else if (pathname === '/' || pathname === '/index.html') {
        serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
    } else if (pathname === '/style.css') {
        serveFile(res, path.join(__dirname, 'style.css'), 'text/css');
    } else if (pathname === '/script.js') {
        serveFile(res, path.join(__dirname, 'script.js'), 'application/javascript');
    } else if (pathname.startsWith('/video/')) {
        const videoPath = path.join(__dirname, pathname);
        serveFile(res, videoPath, 'video/mp4');
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    // Send chat history to new client
    ws.send(JSON.stringify({ type: 'history', messages: chatHistory }));

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'message') {
                const message = {
                    user: msg.user,
                    message: msg.message,
                    timestamp: new Date().toISOString()
                };
                chatHistory.push(message);
                saveChatHistory(chatHistory);
                // Broadcast to all clients
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'message', ...message }));
                    }
                });
            }
        } catch (e) {
            console.error('Invalid message:', e);
        }
});
});

// This replaces the duplicate PORT and the broken app.listen block
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
