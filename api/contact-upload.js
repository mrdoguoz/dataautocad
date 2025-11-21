const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');

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
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const toAddress = process.env.MAIL_TO;
  const subject = process.env.MAIL_SUBJECT || 'Yeni Autocad metraj talebi';

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

// CORS headers
function setCorsHeaders(res) {
  const allowedOrigins = [
    'https://dataautocad.vercel.app',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://localhost',
  ];
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

module.exports = async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  return new Promise((resolve) => {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ ok: false, error: 'File too large (max 2 MB)' });
        } else if (err.code === 'UNSUPPORTED_FILE_TYPE') {
          res.status(400).json({ ok: false, error: 'Unsupported file type' });
        } else {
          res.status(400).json({ ok: false, error: err.message || 'Invalid file upload' });
        }
        return resolve();
      }

      try {
        const { name, email, phone, message } = req.body || {};
        
        if (!name || !name.trim()) {
          res.status(400).json({ ok: false, error: 'Name is required' });
          return resolve();
        }
        
        if (!email || !email.trim()) {
          res.status(400).json({ ok: false, error: 'Email is required' });
          return resolve();
        }

        const file = req.file;
        if (!file) {
          res.status(400).json({ ok: false, error: 'File is required' });
          return resolve();
        }

        if (file.size > MAX_FILE_SIZE) {
          res.status(400).json({ ok: false, error: 'File too large (max 2 MB)' });
          return resolve();
        }

        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!allowedExtensions.has(ext)) {
          res.status(400).json({ ok: false, error: 'Unsupported file type' });
          return resolve();
        }

        console.log(
          `New contact-upload: email=${email}, filename=${file.originalname}, size=${file.size} bytes`
        );

        const mailOptions = buildMailOptions({ name, email, phone, message, file });
        const mailer = getTransporter();
        await mailer.sendMail(mailOptions);

        res.status(200).json({ ok: true });
        resolve();
      } catch (error) {
        console.error('E-posta gönderimi sırasında hata:', error);
        const message = error && error.message ? error.message : 'Unexpected error';
        res.status(500).json({ ok: false, error: message });
        resolve();
      }
    });
  });
};
