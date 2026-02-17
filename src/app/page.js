'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  generateEncryptionKey, 
  encryptFile, 
  generateFileId, 
  storeFile, 
  retrieveFile,
  decryptFile
} from '../utils/crypto';

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [fileKey, setFileKey] = useState(null);
  const [fileId, setFileId] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [manualQrInput, setManualQrInput] = useState('');
  const [uploadHistory, setUploadHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('uploadHistory');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const qrRef = useRef(null);
  const scannerRef = useRef(null);

  // Save history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory));
    } catch (err) {
      console.error('Error saving history:', err);
    }
  }, [uploadHistory]);

  const handleManualQrSubmit = (e) => {
    e.preventDefault();
    if (!manualQrInput.trim()) return;
    
    try {
      const data = JSON.parse(manualQrInput.trim());
      if (data.id && data.key) {
        setScannedData(data);
        setScanError(null);
        setManualQrInput('');
      } else {
        setScanError('Invalid QR code format');
      }
    } catch (e) {
      setScanError('Invalid QR code format. Please enter the complete QR code data.');
    }
  };
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
          scannerRef.current.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Read file and encrypt
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target.result;
      const key = generateEncryptionKey();
      const id = generateFileId();
      
      // Encrypt the file
      const encrypted = encryptFile(fileData, key);
      
      // Store encrypted file in localStorage (for same-browser persistence)
      try {
        localStorage.setItem(`file_${id}`, JSON.stringify({
          encryptedData: encrypted,
          fileName: file.name,
          fileType: file.type,
          key: key
        }));
      } catch (err) {
        console.error('localStorage error:', err);
      }
      
      storeFile(id, encrypted, file.name, file.type, key);
      storeFile(id, encrypted, file.name, file.type, key);
      
      setFileKey(key);
      setFileId(id);
      setEncryptedData(encrypted);
      
      // Generate QR code with file info
      const qrData = JSON.stringify({
        id: id,
        key: key,
        name: file.name,
        type: file.type
      });
      
      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQrCodeUrl(qrUrl);
      setUploadSuccess(true);
      
      // Add to upload history
      const newHistoryItem = {
        id: id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        key: key,
        timestamp: Date.now(),
        qrCodeUrl: qrUrl
      };
      setUploadHistory(prev => [newHistoryItem, ...prev]);
    };
    
    reader.readAsDataURL(file);
  };

  const handleScan = (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      if (data.id && data.key) {
        setScannedData(data);
        setScanError(null);
      }
    } catch (e) {
      setScanError('Invalid QR code format');
    }
  };

  const startScanner = async () => {
    setScanError(null);
    setManualQrInput('');
    setIsScanning(true);
    setScannerLoading(true);
    
    // Small delay to allow DOM to update
    setTimeout(async () => {
      try {
        // Clear any existing scanner
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch (e) {
            // Ignore errors from previous scanner
          }
          scannerRef.current = null;
        }
        
        // Create new scanner instance
        const html5QrCode = new Html5Qrcode('qr-reader');
        
        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // Success callback
            try {
              const data = JSON.parse(decodedText);
              if (data.id && data.key) {
                setScannedData(data);
                setScanError(null);
                // Stop scanning after successful scan
                html5QrCode.stop().then(() => {
                  setIsScanning(false);
                  setScannerLoading(false);
                }).catch(() => {});
              }
            } catch (e) {
              setScanError('Invalid QR code format');
            }
          },
          (errorMessage) => {
            // Error callback - ignore most errors as they're just no QR found
            // Only log in development
            if (process.env.NODE_ENV === 'development') {
              console.log('Scan error:', errorMessage);
            }
          }
        );
        
        scannerRef.current = html5QrCode;
        setScannerLoading(false);
      } catch (err) {
        console.error('Scanner error:', err);
        setScanError('Camera not available. Please grant camera permission.');
        setIsScanning(false);
        setScannerLoading(false);
      }
    }, 100);
  };

  const handleDownload = () => {
    if (!scannedData) return;
    
    // Try to get from localStorage first (for Vercel deployment)
    let fileData = null;
    let fileName = '';
    let fileType = '';
    let encryptedData = '';
    
    try {
      const stored = localStorage.getItem(`file_${scannedData.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.key === scannedData.key) {
          fileData = parsed;
          fileName = parsed.fileName;
          fileType = parsed.fileType;
          encryptedData = parsed.encryptedData;
        } else {
          setScanError('Invalid decryption key');
          return;
        }
      }
    } catch (err) {
      console.error('localStorage read error:', err);
    }
    
    // Fallback to in-memory store
    if (!fileData) {
      const memData = retrieveFile(scannedData.id, scannedData.key);
      if (!memData) {
        setScanError('File not found. This may happen if the file was uploaded in a different browser session.');
        return;
      }
      if (memData.error) {
        setScanError(memData.error);
        return;
      }
      fileName = memData.fileName;
      fileType = memData.fileType;
      encryptedData = memData.encryptedData;
    }
    
    // Decrypt and download
    const decrypted = decryptFile(encryptedData, scannedData.key);
    
    if (decrypted) {
      const link = document.createElement('a');
      link.href = decrypted;
      link.download = fileName || 'downloaded-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setEncryptedData(null);
    setQrCodeUrl(null);
    setFileKey(null);
    setFileId(null);
    setUploadSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 font-sans">
      {/* iOS-style Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-2xl font-semibold text-gray-900 text-center">
            Secure Share
          </h1>
          <p className="text-xs text-gray-500 text-center mt-1">
            Decentralized File Sharing
          </p>
        </div>
      </header>

      {/* iOS-style Tab Bar */}
      <nav className="bg-white/90 backdrop-blur-md border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-md mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-4 flex flex-col items-center transition-all ${
              activeTab === 'upload' 
                ? 'text-blue-600' 
                : 'text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-xs mt-1 font-medium">Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-4 flex flex-col items-center transition-all ${
              activeTab === 'scan' 
                ? 'text-blue-600' 
                : 'text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span className="text-xs mt-1 font-medium">Scan</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-4 flex flex-col items-center transition-all ${
              activeTab === 'history' 
                ? 'text-blue-600' 
                : 'text-gray-400'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs mt-1 font-medium">History</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 pb-24">
        
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {!uploadSuccess ? (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Upload File</h2>
                  <p className="text-sm text-gray-500 mt-1">Encrypted & Secure</p>
                </div>

                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600 font-medium">Tap to select file</p>
                    <p className="text-xs text-gray-400 mt-1">Any file type supported</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-lg p-6 space-y-6">
                {/* Success Header */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">File Encrypted!</h2>
                  <p className="text-sm text-gray-500">{selectedFile?.name}</p>
                </div>

                {/* QR Code */}
                {qrCodeUrl && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-center text-sm text-gray-600 mb-3 font-medium">
                      Scan to Download
                    </p>
                    <div className="bg-white rounded-2xl p-4 shadow-inner">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-48 h-48 mx-auto rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* File Info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">File ID</span>
                    <span className="text-gray-900 font-mono text-xs">{fileId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Encryption Key</span>
                    <span className="text-gray-900 font-mono text-xs truncate max-w-[150px]">{fileKey}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Size</span>
                    <span className="text-gray-900">{(selectedFile?.size / 1024).toFixed(2)} KB</span>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="bg-blue-50 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">AES-256 Encrypted</p>
                    <p className="text-xs text-blue-700">Your file is secure</p>
                  </div>
                </div>

                {/* Upload Another Button */}
                <button
                  onClick={resetUpload}
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-700 font-semibold transition-colors"
                >
                  Upload Another File
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scan Tab */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Scan QR Code</h2>
                <p className="text-sm text-gray-500 mt-1">Download Encrypted Files</p>
              </div>

              {!isScanning && !scannedData && (
                <button
                  onClick={startScanner}
                  disabled={scannerLoading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-2xl text-white font-semibold shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-2">
                    {scannerLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Opening Camera...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Start Scanner
                      </>
                    )}
                  </span>
                </button>
              )}

              {isScanning && (
                <div className="space-y-4">
                  <div id="qr-reader" className="w-full rounded-2xl overflow-hidden bg-black" style={{ minHeight: '300px' }}></div>
                  <button
                    onClick={async () => {
                      if (scannerRef.current) {
                        try {
                          await scannerRef.current.stop();
                          scannerRef.current.clear();
                        } catch (e) {
                          console.log('Error stopping scanner:', e);
                        }
                        scannerRef.current = null;
                      }
                      setIsScanning(false);
                    }}
                    className="w-full py-3 bg-gray-100 rounded-2xl text-gray-700 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {scanError && (
                <div className="mt-4 p-4 bg-red-50 rounded-2xl">
                  <p className="text-red-600 text-sm text-center">{scanError}</p>
                </div>
              )}

              {/* Manual QR Code Input Fallback */}
              {!isScanning && !scannedData && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center mb-3">Or enter QR code data manually:</p>
                  <form onSubmit={handleManualQrSubmit} className="space-y-3">
                    <input
                      type="text"
                      value={manualQrInput}
                      onChange={(e) => setManualQrInput(e.target.value)}
                      placeholder='{"id":"file_xxx","key":"xxx","name":"file.png"}'
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-500 font-mono text-gray-900 placeholder:text-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={!manualQrInput.trim()}
                      className="w-full py-3 bg-gray-800 hover:bg-gray-900 rounded-2xl text-white font-semibold disabled:opacity-50 transition-colors"
                    >
                      Submit Manually
                    </button>
                  </form>
                </div>
              )}

              {scannedData && !scanError && (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-2xl p-4 text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-green-800 font-semibold">QR Code Scanned!</p>
                    <p className="text-green-600 text-sm">{scannedData.name}</p>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-2xl text-white font-semibold shadow-lg transition-all active:scale-95"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download File
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setScannedData(null);
                      setScanError(null);
                    }}
                    className="w-full py-3 bg-gray-100 rounded-2xl text-gray-700 font-semibold"
                  >
                    Scan Another
                  </button>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-white/60 backdrop-blur rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">How it works</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <p className="text-sm text-gray-600">Upload a file and get an encrypted QR code</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <p className="text-sm text-gray-600">Share the QR code with anyone</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-blue-600">3</span>
                  </div>
                  <p className="text-sm text-gray-600">They scan to securely download the file</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Upload History</h2>
                <p className="text-sm text-gray-500 mt-1">Your uploaded files</p>
              </div>

              {uploadHistory.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No uploads yet</p>
                  <p className="text-sm text-gray-400 mt-1">Upload a file to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadHistory.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{item.fileName}</p>
                          <p className="text-xs text-gray-500">{(item.fileSize / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <img 
                          src={item.qrCodeUrl} 
                          alt="QR Code" 
                          className="w-16 h-16 rounded-lg border border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">File ID:</p>
                          <p className="text-xs font-mono text-gray-700 truncate">{item.id}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clear History Button */}
            {uploadHistory.length > 0 && (
              <button
                onClick={() => {
                  // Clear localStorage files
                  uploadHistory.forEach(item => {
                    try {
                      localStorage.removeItem(`file_${item.id}`);
                    } catch (e) {}
                  });
                  setUploadHistory([]);
                }}
                className="w-full py-3 bg-red-50 hover:bg-red-100 rounded-2xl text-red-600 font-semibold transition-colors"
              >
                Clear History
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
