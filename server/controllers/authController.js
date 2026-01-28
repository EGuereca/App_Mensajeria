const User = require('../models/User');

exports.register = async (req, res) => {
    try {
        const { username, publicKey } = req.body;

        // Check if user exists
        let user = await User.findOne({ username });
        if (user) {
            // If user exists, update the public key (or return error depending on requirement, here updating for flexibility or just erroring)
            // For now, let's return error as per standard registration flows, or maybe just return the user?
            // The prompt says "Registro (Recibe user + Public Key)"
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ username, publicKey });
        await user.save();

        res.status(201).json({ msg: 'User registered', user });
    } catch (err) {
        console.error('Error in register:', err.message);
        res.status(500).send('Server Error');
    }
};

exports.getUser = async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ username: user.username, publicKey: user.publicKey, _id: user._id });
    } catch (err) {
        console.error('Error in getUser:', err.message);
        res.status(500).send('Server Error');
    }
};
