import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../App.css';

const KeySetup = () => {
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { registerUser } = useAuth();

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!username.trim()) return;

        setIsLoading(true);
        try {
            await registerUser(username);
            // AuthContext will update 'user' state, triggering transition in App.jsx
        } catch (error) {
            console.error("Failed to setup keys:", error);
            alert("Failed to generate keys or join.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100vw',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #141414 100%)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decorative background elements */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(74, 74, 74, 0.1) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-10%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(74, 74, 74, 0.08) 0%, transparent 70%)',
                borderRadius: '50%',
                pointerEvents: 'none'
            }} />

            <div style={{
                background: 'rgba(26, 26, 26, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(42, 42, 42, 0.5)',
                borderRadius: 'var(--radius-lg)',
                padding: '48px 40px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1,
                position: 'relative'
            }}>
                <div style={{
                    textAlign: 'center',
                    marginBottom: '32px'
                }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        marginBottom: '12px',
                        letterSpacing: '-0.5px'
                    }}>
                        Secure Chat
                    </h1>
                    <p style={{
                        fontSize: '15px',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5'
                    }}>
                        Enter a username to generate your cryptographic identity
                    </p>
                </div>

                <form onSubmit={handleJoin} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <div>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                fontSize: '15px',
                                padding: '14px 16px'
                            }}
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !username.trim()}
                        className="primary"
                        style={{
                            width: '100%',
                            fontSize: '15px',
                            fontWeight: '500',
                            padding: '14px 20px',
                            marginTop: '8px'
                        }}
                    >
                        {isLoading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span>Generating Keys</span>
                                <span style={{
                                    display: 'inline-block',
                                    width: '12px',
                                    height: '12px',
                                    border: '2px solid var(--text-primary)',
                                    borderTopColor: 'transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                            </span>
                        ) : (
                            'Generate Keys & Join'
                        )}
                    </button>
                </form>

                <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                }}>
                    <p style={{
                        fontSize: '12px',
                        color: 'var(--text-tertiary)',
                        textAlign: 'center',
                        lineHeight: '1.5'
                    }}>
                        🔒 Your messages are end-to-end encrypted. Only you and the recipient can read them.
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default KeySetup;
