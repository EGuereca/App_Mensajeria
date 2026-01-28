import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCrypto } from '../hooks/useCrypto';
import { getSocket } from '../services/socket';
import { api } from '../services/api';
import MessageBubble from './MessageBubble';

const ChatWindow = () => {
    const { user, keys } = useAuth(); // keys.privateKey is what we need
    const { deriveSharedSecret, encryptMessage, decryptMessage, importKey } = useCrypto();

    const [activeUsers, setActiveUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); // { username, publicKey }
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [sharedKeys, setSharedKeys] = useState({}); // Map<username, CryptoKey>

    const socket = getSocket();
    const messagesEndRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Request active users
    useEffect(() => {
        // Ideally socket emits 'users' on connect, or we request it.
        // Let's assume server sends 'users' event periodically or on change
        socket.on('users', (usersList) => {
            // Filter out self
            setActiveUsers(usersList.filter(u => u.username !== user.username));
        });

        socket.on('private_message', async (payload) => {
            // payload: { from, encrypted, iv }
            await handleIncomingMessage(payload);
        });

        return () => {
            socket.off('users');
            socket.off('private_message');
        };
    }, []);

    const handleIncomingMessage = async (payload) => {
        const { from, encrypted, iv } = payload;
        let decryptedText = "Error: Could not decrypt";

        try {
            let secret = sharedKeys[from];

            // Helper to fetch fresh key and derive secret
            const getFreshSecret = async () => {
                // Force fetch from API to ensure we have the very latest key from DB
                // activeUsers might be stale if the 'users' broadcast hasn't arrived yet
                try {
                    const userData = await api.getUser(from);
                    if (userData && userData.publicKey) {
                        let pubKey = userData.publicKey;
                        if (typeof pubKey === 'string') {
                            pubKey = JSON.parse(pubKey);
                        }
                        const importedPubKey = await importKey(pubKey, 'public');
                        return await deriveSharedSecret(keys.privateKey, importedPubKey);
                    }
                } catch (e) {
                    console.error("Failed to get fresh secret:", e);
                }
                return null;
            };

            // First attempt: Get secret if missing
            if (!secret) {
                secret = await getFreshSecret();
                if (secret) setSharedKeys(prev => ({ ...prev, [from]: secret }));
            }

            if (secret) {
                try {
                    decryptedText = await decryptMessage(encrypted, iv, secret);
                } catch (retryErr) {
                    console.warn(`Decryption failed for ${from}, retrying with fresh key...`);
                    // Retry logic: Refresh key and try again
                    secret = await getFreshSecret();
                    if (secret) {
                        setSharedKeys(prev => ({ ...prev, [from]: secret }));
                        decryptedText = await decryptMessage(encrypted, iv, secret);
                    } else {
                        throw new Error("Could not derive new secret");
                    }
                }
            }
        } catch (err) {
            console.error("Final decryption err:", err);
            decryptedText = "Error: Could not decrypt (Key mismatch)";
        }

        setMessages(prev => [...prev, {
            sender: from,
            text: decryptedText,
            isMe: false,
            timestamp: Date.now()
        }]);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedUser) return;

        try {
            let secret = sharedKeys[selectedUser.username];
            if (!secret) {
                const importedPubKey = await importKey(selectedUser.publicKey, 'public');
                secret = await deriveSharedSecret(keys.privateKey, importedPubKey);
                setSharedKeys(prev => ({ ...prev, [selectedUser.username]: secret }));
            }

            const { iv, cipherText } = await encryptMessage(inputText, secret);

            // Emit to server
            // Emit to server
            socket.emit('send_message', {
                sender: user.username,
                recipient: selectedUser.username,
                cipherText: cipherText,
                iv: iv
            });

            // Add to local UI
            setMessages(prev => [...prev, {
                sender: user.username,
                text: inputText,
                isMe: true,
                timestamp: Date.now()
            }]);

            setInputText('');

        } catch (err) {
            console.error("Encryption failed:", err);
            alert("Failed to send message: " + err.message);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
            {/* Sidebar: User List */}
            <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '10px' }}>
                <h3>Active Users</h3>
                {activeUsers.map(u => (
                    <div
                        key={u.username}
                        onClick={() => setSelectedUser(u)}
                        style={{
                            padding: '10px',
                            cursor: 'pointer',
                            background: selectedUser?.username === u.username ? '#eef' : 'transparent',
                            borderRadius: '5px'
                        }}
                    >
                        {u.username}
                    </div>
                ))}
            </div>

            {/* Main Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {selectedUser ? (
                    <>
                        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', background: '#f9f9f9' }}>
                            Chatting with: <strong>{selectedUser.username}</strong>
                        </div>

                        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                            {messages
                                .filter(m => m.sender === selectedUser.username || (m.sender === user.username && selectedUser.username))
                                // Note: A real app would segregate messages by conversation ID
                                .map((m, i) => (
                                    <MessageBubble key={i} message={m.text} sender={m.sender} isMe={m.isMe} />
                                ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} style={{ padding: '10px', borderTop: '1px solid #ccc', display: 'flex' }}>
                            <input
                                type="text"
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                placeholder="Type a message..."
                                style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
                            />
                            <button type="submit" style={{ marginLeft: '10px', padding: '10px 20px' }}>Send</button>
                        </form>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        Select a user to start chatting safely.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
