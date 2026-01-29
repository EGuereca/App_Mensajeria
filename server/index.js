const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authController = require('./controllers/authController');
const messageController = require('./controllers/messageController');
const chatHandler = require('./sockets/chatHandler');

const app = express();

// SSL Certificates
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs/server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/server.crt'))
};

const server = https.createServer(sslOptions, app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/register', authController.register);
app.get('/api/users/:username', authController.getUser);
app.get('/api/messages', messageController.getHistory);

// Socket Logic
chatHandler(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => console.log(`HTTPS Server running on port ${PORT}`));
