const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authController = require('./controllers/authController');
const messageController = require('./controllers/messageController');
const chatHandler = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);
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

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
