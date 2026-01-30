import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCrypto } from '../hooks/useCrypto';
import { connectSocket, disconnectSocket, socket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { username: string, publicKey: JsonWebKey }
    const [keys, setKeys] = useState(null); // CryptoKeyPair
    const [loading, setLoading] = useState(true);
    const { generateKeyPair, exportKey, importKey } = useCrypto();

    // Load user from local storage on mount
    useEffect(() => {
        const loadUser = async () => {
            const stored = localStorage.getItem('chat_user');
            if (stored) {
                try {
                    const { username, publicKeyJwk, privateKeyJwk } = JSON.parse(stored);

                    const publicKey = await importKey(publicKeyJwk, 'public');
                    const privateKey = await importKey(privateKeyJwk, 'private');

                    setKeys({ publicKey, privateKey });
                    setUser({ username, publicKey: publicKeyJwk });

                    connectSocket(username, publicKeyJwk);
                } catch (e) {
                    console.error("Failed to load user from storage:", e);
                    localStorage.removeItem('chat_user');
                }
            }
            setLoading(false);
        };
        loadUser();
    }, [importKey]);

    const registerUser = async (username) => {
        // 1. Generate Keys
        const keyPair = await generateKeyPair();
        // 2. Export Keys
        const publicKeyJwk = await exportKey(keyPair.publicKey);
        const privateKeyJwk = await exportKey(keyPair.privateKey);

        // 3. Save to LocalStorage
        localStorage.setItem('chat_user', JSON.stringify({
            username,
            publicKeyJwk,
            privateKeyJwk
        }));

        // 4. Connect Socket explicitly BEFORE setting user state
        connectSocket(username, publicKeyJwk);

        // 5. Set State
        setKeys(keyPair);
        setUser({ username, publicKey: publicKeyJwk });

        return { username, publicKey: publicKeyJwk };
    };

    const logout = () => {
        setUser(null);
        setKeys(null);
        disconnectSocket();
        localStorage.removeItem('chat_user');
    };

    return (
        <AuthContext.Provider value={{ user, keys, registerUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
