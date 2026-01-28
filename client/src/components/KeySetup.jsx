import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
            gap: '20px'
        }}>
            <h1>E2EE Chat Setup</h1>
            <p>Enter a username to generate your cryptographic identity.</p>

            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    style={{ padding: '10px', fontSize: '16px' }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !username}
                    style={{ padding: '10px', fontSize: '16px', cursor: 'pointer' }}
                >
                    {isLoading ? 'Generating Keys...' : 'Generate Keys & Join'}
                </button>
            </form>
        </div>
    );
};

export default KeySetup;
