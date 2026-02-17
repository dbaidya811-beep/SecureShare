'use client';

import CryptoJS from 'crypto-js';

// Generate a random encryption key
export const generateEncryptionKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString();
};

// Encrypt file data
export const encryptFile = (fileData, key) => {
  return CryptoJS.AES.encrypt(fileData, key).toString();
};

// Decrypt file data
export const decryptFile = (encryptedData, key) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Generate unique file ID
export const generateFileId = () => {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Store encrypted file in memory (simulating decentralized storage)
const fileStorage = new Map();

export const storeFile = (fileId, encryptedData, fileName, fileType, key) => {
  fileStorage.set(fileId, {
    encryptedData,
    fileName,
    fileType,
    key,
    timestamp: Date.now()
  });
  return fileId;
};

export const retrieveFile = (fileId, key) => {
  const fileData = fileStorage.get(fileId);
  if (!fileData) return null;
  
  if (fileData.key !== key) {
    return { error: 'Invalid decryption key' };
  }
  
  return {
    encryptedData: fileData.encryptedData,
    fileName: fileData.fileName,
    fileType: fileData.fileType
  };
};

export const getFileInfo = (fileId) => {
  const fileData = fileStorage.get(fileId);
  if (!fileData) return null;
  
  return {
    fileName: fileData.fileName,
    fileType: fileData.fileType,
    timestamp: fileData.timestamp
  };
};
