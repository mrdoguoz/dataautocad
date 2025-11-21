const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

require('dotenv').config(); // .env içeriğini yükle

const PORT = Number(process.env.PORT || process.env.BACKEND_PORT || 5001);
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const allowedExtensions = new Set(['.dwg', '.dxf', '.zip', '.pdf', '.png', '.jpg', '.jpeg']);
const allowedMimeTypes = new Set([
  'application/acad',
  'image/vnd.dwg',
  'application/dwg',
  'application/x-dwg',
  'application/dxf',
  'application/x-dxf',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'image/png',
  'image/jpeg',
]);

const app = express();

const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5000';
const allowedOrigins = rawAllowedOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow null origin for file:// contexts
    if (!origin || origin === 'null') {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS policy'));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.has(ext)) {
      const error = new Error('Unsupported file type');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error);
    }
    if (file.mimetype && !allowedMimeTypes.has(file.mimetype)) {
      console.warn('Bilinmeyen MIME türü alındı, uzantıya bakılarak devam ediliyor:', file.mimetype);
    }
    cb(null, true);
  },
});

function buildTransport() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_TO'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Eksik ortam değişkenleri: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

let cachedTransporter;
function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = buildTransport();
  }
  return cachedTransporter;
}

function buildMailOptions({ name, email, phone, message, file }) {
  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const toAddress = process.env.MAIL_TO;
  const subject = process.env.MAIL_SUBJECT || 'Yeni Autocad metraj talebi (lokal)';

  const details = [
    `Ad Soyad: ${name}`,
    `E-posta: ${email}`,
    `Telefon: ${phone || '-'}`,
    `Mesaj: ${message || '-'}`,
  ].join('\n');

  const attachments = [];
  if (file) {
    attachments.push({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
  }

  return {
    from: fromAddress,
    to: toAddress,
    subject,
    text: details,
    attachments,
  };
}

app.options('/api/contact-upload', cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});

app.post('/api/contact-upload', upload.single('file'), async (req, res) => {
  try {
    const { name, email, phone, message } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ ok: false, error: 'Email is required' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: 'File is required' });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ ok: false, error: 'File too large (max 2 MB)' });
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return res.status(400).json({ ok: false, error: 'Unsupported file type' });
    }

    console.log(
      `New contact-upload: email=${email}, filename=${file.originalname}, size=${file.size} bytes`
    );

    const mailOptions = buildMailOptions({ name, email, phone, message, file });
    const mailer = getTransporter();
    await mailer.sendMail(mailOptions);

    return res.json({ ok: true });
  } catch (error) {
    if (error && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, error: 'File too large (max 2 MB)' });
    }
    if (error && error.code === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({ ok: false, error: 'Unsupported file type' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ ok: false, error: error.message || 'Invalid file upload' });
    }
    console.error('E-posta gönderimi veya işleme sırasında hata', error);
    const message = error && error.message ? error.message : 'Unexpected error';
    return res.status(500).json({ ok: false, error: message });
  }
});

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, error: 'File too large (max 2 MB)' });
  }
  if (err && err.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({ ok: false, error: 'Unsupported file type' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ ok: false, error: err.message || 'Invalid file upload' });
  }
  if (err) {
    console.error('Beklenmeyen hata:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
  return next();
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
