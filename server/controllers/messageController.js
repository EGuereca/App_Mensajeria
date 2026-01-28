const Message = require('../models/Message');

// Helper to save message from socket
exports.saveMessage = async (data) => {
    try {
        const { sender, recipient, cipherText, iv } = data;
        const message = new Message({
            sender,
            recipient,
            cipherText,
            iv
        });
        await message.save();
        return message;
    } catch (err) {
        console.error('Error saving message:', err);
        return null;
    }
};

// API to get history
exports.getHistory = async (req, res) => {
    try {
        const { userId1, userId2 } = req.query;

        if (!userId1 || !userId2) {
            return res.status(400).json({ msg: 'Missing user parameters' });
        }

        const messages = await Message.find({
            $or: [
                { sender: userId1, recipient: userId2 },
                { sender: userId2, recipient: userId1 }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
