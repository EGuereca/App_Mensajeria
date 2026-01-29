const messageController = require('../controllers/messageController');
const User = require('../models/User');

module.exports = (io) => {
    // Map userId (username) -> socketId
    const activeUsers = new Map();

    const broadcastUsers = () => {
        const usersList = Array.from(activeUsers.entries()).map(([username, data]) => ({
            username,
            publicKey: data.publicKey
        }));
        io.emit('users', usersList);
    };

    io.on('connection', (socket) => {
        const username = socket.handshake.query.username;
        const publicKeyStr = socket.handshake.query.publicKey;
        let publicKey = null;
        try {
            if (publicKeyStr) publicKey = JSON.parse(publicKeyStr);
        } catch (e) {
            console.error('Invalid public key from', username);
        }

        console.log('New client connected:', socket.id, 'Username:', username);

        // Auto-register user from handshake
        if (username) {
            activeUsers.set(username, { socketId: socket.id, publicKey });
            console.log(`User registered: ${username} with socket ${socket.id}`);

            // Persist/Update user in DB so API has fresh key
            if (publicKeyStr) {
                User.findOneAndUpdate(
                    { username },
                    { publicKey: publicKeyStr }, // Store as string to match Model
                    { upsert: true, new: true }
                ).then(u => console.log('User key updated in DB:', username))
                    .catch(e => console.error('Error updating DB key:', e));
            }

            broadcastUsers();
        }

        // Deprecated: Client now registers via handshake, but keeping for compatibility if needed
        socket.on('register_user', (userId) => {
            activeUsers.set(userId, { socketId: socket.id, publicKey: null }); // No PK in legacy register
            console.log(`User registered (manual): ${userId} with socket ${socket.id}`);
            broadcastUsers();
        });

        socket.on('join_room', (room) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        socket.on('send_message', async (data) => {
            // data: { sender, recipient, cipherText, iv }
            console.log('Message received:', data);

            // 1. Save to DB
            const savedMessage = await messageController.saveMessage(data);

            if (savedMessage) {
                // 2. Emit to recipient if online
                const recipientData = activeUsers.get(data.recipient);
                const recipientSocketId = recipientData ? recipientData.socketId : null;

                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('receive_message', savedMessage);
                    // Also emit to sender (optional, if we want confirmation or multi-device sync)
                    // But client usually adds its own message locally.
                }

                // Also emit to the specific implementation of 'private_message' used in client
                if (recipientSocketId) {
                    io.to(recipientSocketId).emit('private_message', {
                        from: data.sender,
                        encrypted: data.cipherText,
                        iv: data.iv
                    });
                }
            }
        });

        // Typing indicator
        socket.on('typing', (data) => {
            // data: { from, to, isTyping }
            if (!data?.from || !data?.to) return;

            const recipientData = activeUsers.get(data.to);
            const recipientSocketId = recipientData ? recipientData.socketId : null;

            if (recipientSocketId) {
                io.to(recipientSocketId).emit('typing', {
                    from: data.from,
                    isTyping: !!data.isTyping,
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            let userRemoved = false;
            for (let [key, value] of activeUsers.entries()) {
                if (value.socketId === socket.id) {
                    activeUsers.delete(key);
                    userRemoved = true;
                    break;
                }
            }
            if (userRemoved) {
                broadcastUsers();
            }
        });
    });
};
