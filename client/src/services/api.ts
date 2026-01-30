const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export const api = {
    // Check if a user exists or get their public key
    async getUser(username: string) {
        const res = await fetch(`${API_URL}/users/${username}`);
        if (!res.ok) throw new Error('User not found');
        return res.json();
    },

    // Register public key (if backend demands it, though we might just rely on socket handshake)
    async register(username: string, publicKeyJwk: JsonWebKey) {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, publicKey: publicKeyJwk })
        });
        if (!res.ok) throw new Error('Registration failed');
        return res.json();
    },

    async getHistory(userId1: string, userId2: string) {
        const res = await fetch(`${API_URL}/messages?userId1=${userId1}&userId2=${userId2}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
    }
};
