const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Store file metadata
const METADATA_FILE = path.join(DATA_DIR, 'files.json');

function loadMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading metadata:', err);
  }
  return {};
}

function saveMetadata(metadata) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const key = crypto.randomBytes(32).toString('hex');
    
    // Save file to disk
    const filePath = path.join(DATA_DIR, fileId);
    fs.writeFileSync(filePath, req.file.buffer);

    // Save metadata
    const metadata = loadMetadata();
    metadata[fileId] = {
      id: fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      key: key,
      createdAt: Date.now()
    };
    saveMetadata(metadata);

    res.json({
      success: true,
      fileId: fileId,
      key: key,
      name: req.file.originalname,
      type: req.file.mimetype
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Download endpoint
app.get('/download/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    const key = req.query.key;
    
    if (!fileId || !key) {
      return res.status(400).json({ error: 'Missing file ID or key' });
    }

    const metadata = loadMetadata();
    const fileMeta = metadata[fileId];

    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fileMeta.key !== key) {
      return res.status(403).json({ error: 'Invalid key' });
    }

    const filePath = path.join(DATA_DIR, fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    res.set('Content-Type', fileMeta.mimeType);
    res.set('Content-Disposition', `attachment; filename="${fileMeta.originalName}"`);
    res.send(fileBuffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Get file info endpoint
app.get('/file/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    const metadata = loadMetadata();
    const fileMeta = metadata[fileId];

    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      id: fileMeta.id,
      name: fileMeta.originalName,
      type: fileMeta.mimeType,
      size: fileMeta.size
    });
  } catch (err) {
    console.error('Get file error:', err);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// Delete file after download
app.delete('/file/:id', (req, res) => {
  try {
    const fileId = req.params.id;
    const key = req.query.key;
    
    const metadata = loadMetadata();
    const fileMeta = metadata[fileId];

    if (!fileMeta) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (fileMeta.key !== key) {
      return res.status(403).json({ error: 'Invalid key' });
    }

    // Delete file from disk
    const filePath = path.join(DATA_DIR, fileId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete metadata
    delete metadata[fileId];
    saveMetadata(metadata);

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`DB Server running on http://localhost:${PORT}`);
});
