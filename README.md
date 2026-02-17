# 🔒 Secure Share - Decentralized File Sharing

A modern, iOS-style file sharing application that allows users to securely upload files and share them via QR codes. Built with Next.js, Tailwind CSS, and AES-256 encryption.

## ✨ Features

- **File Upload** - Upload any file type securely
- **AES-256 Encryption** - All files are encrypted before storage
- **QR Code Generation** - Generate QR codes for easy file sharing
- **QR Code Scanner** - Scan QR codes to download files
- **Manual Input** - Enter QR data manually if camera is not available
- **Upload History** - View all your uploaded files with their QR codes
- **Modern iOS Design** - Beautiful glassmorphism UI with smooth animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dbaidya811-beep/SecureShare.git
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Usage

### Upload a File
1. Click the **Upload** tab
2. Tap "Select file" to choose a file
3. The file will be encrypted and a QR code will be generated
4. Share the QR code with others

### Download a File
1. Click the **Scan** tab
2. Click "Start Scanner" to open the camera
3. Scan the QR code to download the file
4. Or use manual input if camera is not available

### View History
1. Click the **History** tab
2. See all your uploaded files
3. Each entry shows the file name, size, QR code, and timestamp
4. Use "Clear History" to remove all entries

## 🔐 Security

- Files are encrypted using **AES-256** encryption
- Each file gets a unique encryption key
- The QR code contains both the file ID and encryption key
- Files are stored in memory (session-based)

## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **Tailwind CSS** - Styling
- **crypto-js** - AES encryption
- **qrcode** - QR code generation
- **html5-qrcode** - QR code scanning

## 📝 License

MIT License
