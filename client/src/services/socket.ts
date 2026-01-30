import { io, Socket } from 'socket.io-client';

export let socket: Socket | null = null;

// URL configurable via environment variable for network access
const URL = import.meta.env.VITE_API_URL || 'https://localhost:3000';

export const connectSocket = (username: string, publicKey: JsonWebKey) => {
    if (socket) return socket;

    socket = io(URL, {
        query: {
            username,
            publicKey: JSON.stringify(publicKey)
        },
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('Connected to server with ID:', socket?.id);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket not initialized. Call connectSocket first.");
    }
    return socket;
}
