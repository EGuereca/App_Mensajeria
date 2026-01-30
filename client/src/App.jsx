import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import KeySetup from './components/KeySetup';
import ChatWindow from './components/ChatWindow';
import './index.css'; // Assuming basic styles or reset

const AppContent = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <>
            {!user ? <KeySetup /> : <ChatWindow />}
        </>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
