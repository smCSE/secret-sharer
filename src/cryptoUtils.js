import CryptoJS from 'crypto-js';

// 1. Generate a random 16-character key
export const generateKey = () => {
    return Math.random().toString(36).slice(-16); // Simple random string
};

// 2. Lock the message using the key
export const encryptMessage = (message, key) => {
    return CryptoJS.AES.encrypt(message, key).toString();
};

// 3. Unlock the message using the key
export const decryptMessage = (encryptedMessage, key) => {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
    return bytes.toString(CryptoJS.enc.Utf8);
};