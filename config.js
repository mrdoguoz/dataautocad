// Backend endpoint adresi
// Production için Vercel URL'ini kullan, local development için localhost
const CONTACT_API_URL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001/api/contact-upload'
    : 'https://dataautocad.vercel.app/api/contact-upload';
