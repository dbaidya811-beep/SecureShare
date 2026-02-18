# 🔒 SecureShare - Decentralized File Sharing System

A modern, iOS-style decentralized file sharing application with QR code-based secure file transfer.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16.x-black)
![Express](https://img.shields.io/badge/Express-5.x-black)

## ✨ Features

- **Secure File Upload** - Upload files with automatic QR code generation
- **QR Code Sharing** - Share files easily via QR codes
- **Auto-Delete** - Files are automatically deleted after download
- **Cross-Device Support** - Works on any device with a browser
- **Local Storage** - Files stored locally on your server
- **Modern UI** - Beautiful iOS-style interface with smooth animations
- **Upload History** - View all your previously uploaded files

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn

### Local Development

```bash
# Clone the repository
git clone https://github.com/dbaidya811-beep/SecureShare.git
cd file_shareing

# Install frontend dependencies
npm install

# Install backend dependencies
cd db && npm install && cd ..

# Start backend (Terminal 1)
cd db && npm start

# Start frontend (Terminal 2)
npm run dev
```

## ☁️ Deployment

### Deploy Backend on Render (Free)

1. **Push your code to GitHub**

2. **Go to [Render Dashboard](https://dashboard.render.com)**
   - Click "New +" → "Web Service"

3. **Connect your GitHub repository**
   - Select the `db` folder as the root directory
   - Or create a separate repository for just the `db` folder

4. **Configure the service:**
   - Name: `fileshare-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

5. **Click "Create Web Service"**

6. **Copy your deployed URL** (e.g., `https://fileshare-api.onrender.com`)

### Deploy Frontend on Vercel

1. **Go to [Vercel Dashboard](https://vercel.com)**
   - Click "New Project"
   - Import your GitHub repository

2. **Add Environment Variable:**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: Your Render backend URL (e.g., `https://fileshare-api.onrender.com`)

3. **Click "Deploy"**

### After Deployment

Once deployed, the app will automatically use your production API URL!

## 📱 How to Use

### Upload a File
1. Open the application in your browser
2. Click on the **Upload** tab
3. Select a file (max 100MB)
4. Wait for the QR code to generate
5. Share the QR code with the recipient

### Download a File
1. Click on the **Scan** tab
2. Click **Start Scanner** to open your camera
3. Scan the QR code
4. The file will download automatically
5. The file will be deleted from the server after download

### View Upload History
1. Click on the **History** tab
2. View all your previously uploaded files
3. Each entry shows filename, size, and QR code

## 🛠️ Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16, React, Tailwind CSS |
| Backend | Express.js 5, Multer |
| QR Code | qrcode, html5-qrcode |
| Hosting | Vercel (Frontend), Render (Backend) |

## 📁 Project Structure

```
file_shareing/
├── db/                      # Backend server (deploy this on Render)
│   ├── server.js           # Express server
│   ├── data/              # File storage directory
│   ├── render.yaml        # Render deployment config
│   ├── package.json
│   └── package-lock.json
├── src/
│   ├── app/
│   │   ├── page.js        # Main application
│   │   ├── layout.js      # Layout configuration
│   │   └── globals.css   # Global styles
│   └── utils/
│       └── crypto.js       # Encryption utilities
├── public/                 # Static assets
├── package.json
└── README.md
```

## 🔐 Security Features

- Files are encrypted before storage
- Each file has a unique encryption key
- Auto-delete after download prevents unauthorized access
- Server-side file validation

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload a file |
| GET | `/download/:id` | Download a file |
| GET | `/file/:id` | Get file metadata |
| DELETE | `/file/:id` | Delete a file |

## ⚠️ Important Notes

- Maximum file size: 100MB
- Files are automatically deleted after one download
- For local testing, backend runs on `http://localhost:3001`
- For production, set `NEXT_PUBLIC_API_URL` environment variable

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT License - feel free to use this project for any purpose.
