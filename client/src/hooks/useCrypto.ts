import { useCallback } from 'react';

// Utilities for ArrayBuffer <-> Base64 conversion
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export const useCrypto = () => {
    // Generate ECDH Key Pair
    const generateKeyPair = useCallback(async (): Promise<CryptoKeyPair> => {
        return window.crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256',
            },
            true, // extractable
            ['deriveKey', 'deriveBits']
        );
    }, []);

    // Export Key to JWK (for public transmission or local storage)
    const exportKey = useCallback(async (key: CryptoKey): Promise<JsonWebKey> => {
        return window.crypto.subtle.exportKey('jwk', key);
    }, []);

    // Import Key from JWK
    const importKey = useCallback(async (jwk: JsonWebKey, type: 'public' | 'private'): Promise<CryptoKey> => {
        return window.crypto.subtle.importKey(
            'jwk',
            jwk,
            {
                name: 'ECDH',
                namedCurve: 'P-256',
            },
            true,
            type === 'private' ? ['deriveKey', 'deriveBits'] : []
        );
    }, []);

    // Derive Shared Secret (AES-GCM Key) from My Private Key + Other Public Key
    const deriveSharedSecret = useCallback(async (
        myPrivateKey: CryptoKey,
        otherPublicKey: CryptoKey
    ): Promise<CryptoKey> => {
        return window.crypto.subtle.deriveKey(
            {
                name: 'ECDH',
                public: otherPublicKey,
            },
            myPrivateKey,
            {
                name: 'AES-GCM',
                length: 256,
            },
            true,
            ['encrypt', 'decrypt']
        );
    }, []);

    // Encrypt Message
    const encryptMessage = useCallback(async (
        message: string,
        sharedKey: CryptoKey
    ): Promise<{ iv: string; cipherText: string }> => {
        const encoder = new TextEncoder();
        const encodedMessage = encoder.encode(message);
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

        const cipherBuffer = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            sharedKey,
            encodedMessage
        );

        return {
            iv: arrayBufferToBase64(iv.buffer),
            cipherText: arrayBufferToBase64(cipherBuffer),
        };
    }, []);

    // Decrypt Message
    const decryptMessage = useCallback(async (
        cipherTextB64: string,
        ivB64: string,
        sharedKey: CryptoKey
    ): Promise<string> => {
        try {
            const iv = base64ToArrayBuffer(ivB64);
            const cipherText = base64ToArrayBuffer(cipherTextB64);

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(iv),
                },
                sharedKey,
                cipherText
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt message');
        }
    }, []);

    return {
        generateKeyPair,
        exportKey,
        importKey,
        deriveSharedSecret,
        encryptMessage,
        decryptMessage,
        arrayBufferToBase64,
        base64ToArrayBuffer
    };
};
