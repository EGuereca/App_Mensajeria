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
    const [typingUsers, setTypingUsers] = useState({}); // Map<username, boolean>
    const [isTyping, setIsTyping] = useState(false);

    const socket = getSocket();
    const messagesEndRef = useRef(null);
    const typingTimeoutsRef = useRef({});
    const typingDebounceRef = useRef(null);

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

        socket.on('typing', ({ from, isTyping }) => {
            if (!from) return;

            setTypingUsers(prev => ({
                ...prev,
                [from]: isTyping
            }));

            // Auto-clear indicator after timeout to avoid stuck state
            if (isTyping) {
                if (typingTimeoutsRef.current[from]) {
                    clearTimeout(typingTimeoutsRef.current[from]);
                }
                typingTimeoutsRef.current[from] = setTimeout(() => {
                    setTypingUsers(prev => {
                        const updated = { ...prev };
                        delete updated[from];
                        return updated;
                    });
                }, 2500);
            } else {
                if (typingTimeoutsRef.current[from]) {
                    clearTimeout(typingTimeoutsRef.current[from]);
                }
                setTypingUsers(prev => {
                    const updated = { ...prev };
                    delete updated[from];
                    return updated;
                });
            }
        });

        return () => {
            socket.off('users');
            socket.off('private_message');
            socket.off('typing');
            Object.values(typingTimeoutsRef.current).forEach(timeoutId => clearTimeout(timeoutId));
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
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

    const emitTyping = (typing) => {
        if (!selectedUser) return;
        socket.emit('typing', {
            from: user.username,
            to: selectedUser.username,
            isTyping: typing
        });
    };

    const handleInputChange = (e) => {
        const text = e.target.value;
        setInputText(text);

        if (!selectedUser) return;

        if (!isTyping) {
            setIsTyping(true);
            emitTyping(true);
        }

        if (typingDebounceRef.current) {
            clearTimeout(typingDebounceRef.current);
        }

        typingDebounceRef.current = setTimeout(() => {
            setIsTyping(false);
            emitTyping(false);
        }, 1500);
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
            setIsTyping(false);
            emitTyping(false);

        } catch (err) {
            console.error("Encryption failed:", err);
            alert("Failed to send message: " + err.message);
        }
    };

    return (
        <>
        <div style={{ 
            display: 'flex', 
            height: '100vh', 
            width: '100vw',
            background: 'var(--bg-primary)',
            overflow: 'hidden'
        }}>
            {/* Sidebar: User List */}
            <div style={{ 
                width: '280px', 
                borderRight: '1px solid var(--border-color)', 
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <div style={{
                    padding: '24px 20px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)'
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        margin: 0,
                        letterSpacing: '-0.3px'
                    }}>
                        Active Users
                    </h3>
                    <p style={{
                        fontSize: '12px',
                        color: 'var(--text-tertiary)',
                        marginTop: '4px',
                        marginBottom: 0
                    }}>
                        {activeUsers.length} {activeUsers.length === 1 ? 'user' : 'users'} online
                    </p>
                </div>
                
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px'
                }}>
                    {activeUsers.length === 0 ? (
                        <div style={{
                            padding: '24px',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            fontSize: '14px'
                        }}>
                            No other users online
                        </div>
                    ) : (
                        activeUsers.map(u => (
                            <div
                                key={u.username}
                                onClick={() => setSelectedUser(u)}
                                style={{
                                    padding: '14px 16px',
                                    cursor: 'pointer',
                                    background: selectedUser?.username === u.username 
                                        ? 'var(--bg-active)' 
                                        : 'transparent',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '4px',
                                    border: selectedUser?.username === u.username 
                                        ? '1px solid var(--border-hover)' 
                                        : '1px solid transparent',
                                    transition: 'var(--transition)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedUser?.username !== u.username) {
                                        e.currentTarget.style.background = 'var(--bg-hover)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedUser?.username !== u.username) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-primary)',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    flexShrink: 0
                                }}>
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: 'var(--text-primary)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {u.username}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                background: 'var(--bg-primary)',
                height: '100%'
            }}>
                {selectedUser ? (
                    <>
                        <div style={{ 
                            padding: '20px 24px', 
                            borderBottom: '1px solid var(--border-color)', 
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                fontSize: '16px',
                                flexShrink: 0
                            }}>
                                {selectedUser.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    marginBottom: '2px'
                                }}>
                                    {selectedUser.username}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-tertiary)'
                                }}>
                                    End-to-end encrypted
                                </div>
                            </div>
                        </div>

                        <div style={{ 
                            flex: 1, 
                            padding: '24px', 
                            overflowY: 'auto',
                            background: 'var(--bg-primary)'
                        }}>
                            <div style={{
                                maxWidth: '800px',
                                margin: '0 auto'
                            }}>
                                {messages
                                    .filter(m => m.sender === selectedUser.username || (m.sender === user.username && selectedUser.username))
                                    .map((m, i) => (
                                        <MessageBubble key={i} message={m.text} sender={m.sender} isMe={m.isMe} />
                                    ))}
                                {typingUsers[selectedUser.username] && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'flex-start',
                                        padding: '6px 8px 0 8px'
                                    }}>
                                        <div style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '10px 14px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: 'var(--text-tertiary)',
                                                display: 'inline-block',
                                                animation: 'typing-bounce 1.2s infinite ease-in-out',
                                                animationDelay: '0s'
                                            }} />
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: 'var(--text-tertiary)',
                                                display: 'inline-block',
                                                animation: 'typing-bounce 1.2s infinite ease-in-out',
                                                animationDelay: '0.15s'
                                            }} />
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: 'var(--text-tertiary)',
                                                display: 'inline-block',
                                                animation: 'typing-bounce 1.2s infinite ease-in-out',
                                                animationDelay: '0.3s'
                                            }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <form onSubmit={sendMessage} style={{ 
                            padding: '20px 24px', 
                            borderTop: '1px solid var(--border-color)', 
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-end'
                        }}>
                            <input
                                type="text"
                                value={inputText}
                                onChange={handleInputChange}
                                placeholder="Type a message..."
                                style={{ 
                                    flex: 1, 
                                    padding: '14px 18px',
                                    fontSize: '15px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <button 
                                type="submit" 
                                className="primary"
                                style={{ 
                                    padding: '14px 28px',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    borderRadius: 'var(--radius-md)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Send
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '12px',
                        color: 'var(--text-tertiary)',
                        padding: '40px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '8px',
                            opacity: 0.5
                        }}>
                            💬
                        </div>
                        <div style={{
                            fontSize: '18px',
                            fontWeight: '500',
                            color: 'var(--text-secondary)',
                            marginBottom: '4px'
                        }}>
                            Select a user to start chatting
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: 'var(--text-tertiary)',
                            textAlign: 'center',
                            maxWidth: '400px'
                        }}>
                            Choose a user from the sidebar to begin a secure, end-to-end encrypted conversation
                        </div>
                    </div>
                )}
            </div>
        </div>
        <style>{`
            @keyframes typing-bounce {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                30% { transform: translateY(-4px); opacity: 1; }
            }
        `}</style>
        </>
    );
};

export default ChatWindow;
