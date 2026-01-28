import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCrypto } from '../hooks/useCrypto';
import { connectSocket, disconnectSocket, socket } from '../services/socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { username: string, publicKey: JsonWebKey }
    const [keys, setKeys] = useState(null); // CryptoKeyPair
    const { generateKeyPair, exportKey } = useCrypto();

    // Initialize socket when user is logged in
    // REMOVED: useEffect race condition caused ChatWindow to render before socket was ready
    // useEffect(() => {
    //     if (user) {
    //         connectSocket(user.username);
    //         return () => {
    //             disconnectSocket();
    //         };
    //     }
    // }, [user]);

    const registerUser = async (username) => {
        // 1. Generate Keys
        const keyPair = await generateKeyPair();
        // 2. Export Public Key
        const publicKeyJwk = await exportKey(keyPair.publicKey);

        // 3. Connect Socket explicitly BEFORE setting user state
        // This ensures socket is ready when ChatWindow renders
        connectSocket(username, publicKeyJwk);

        // 4. Set State (In real app, you'd send public key to backend here usually, or on socket connect)
        setKeys(keyPair);
        setUser({ username, publicKey: publicKeyJwk });

        // Note: Private Key stays in memory (or export/save to localStorage if desired)
        return { username, publicKey: publicKeyJwk };
    };

    const logout = () => {
        setUser(null);
        setKeys(null);
        disconnectSocket();
    };

    return (
        <AuthContext.Provider value={{ user, keys, registerUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
