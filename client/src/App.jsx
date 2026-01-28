import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import KeySetup from './components/KeySetup';
import ChatWindow from './components/ChatWindow';
import './index.css'; // Assuming basic styles or reset

const AppContent = () => {
    const { user } = useAuth();

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
