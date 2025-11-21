const form = document.getElementById('contact-form');
const statusEl = document.getElementById('status-message');
const submitBtn = document.getElementById('submit-btn');
const fileInput = document.getElementById('file');
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const allowedExtensions = ['.dwg', '.dxf', '.zip', '.pdf', '.png', '.jpg', '.jpeg'];
const allowedMimeTypes = [
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
];
const apiEndpoint = typeof CONTACT_API_URL === 'string' ? CONTACT_API_URL.trim() : '';

function setMessage(text, type = 'info') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = `message${type === 'info' ? '' : ` ${type}`}`;
}

function toggleForm(disabled) {
  if (!form) return;
  Array.from(form.elements).forEach((el) => {
    el.disabled = disabled;
  });
  if (submitBtn) submitBtn.disabled = disabled;
}

function validateRequired(value, label) {
  if (!value || !String(value).trim()) {
    throw new Error(`${label} alanı boş bırakılamaz.`);
  }
}

function validateFile(file) {
  if (!file) {
    throw new Error('Lütfen en fazla 2 MB boyutunda DWG/DXF veya desteklenen formatlardan bir dosya seçin.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Dosya boyutu 2 MB sınırını aşıyor.');
  }

  const dotIndex = file.name.lastIndexOf('.');
  const extension = dotIndex !== -1 ? file.name.slice(dotIndex).toLowerCase() : '';
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Yalnızca DWG, DXF, ZIP, PDF, PNG veya JPG dosyaları yüklenebilir.');
  }

  if (file.type && !allowedMimeTypes.includes(file.type)) {
    console.warn('Bilinmeyen MIME türü, dosya uzantısı ile doğrulandı:', file.type);
  }
}

async function submitForm(event) {
  event.preventDefault();
  setMessage('Form hazırlanıyor...');

  if (!apiEndpoint) {
    setMessage('API adresi yapılandırılmadı. config.js içindeki CONTACT_API_URL değerini ayarlayın.', 'error');
    return;
  }

  const formData = new FormData(form);
  const file = fileInput?.files?.[0] || null;

  try {
    validateRequired(formData.get('name'), 'Ad Soyad');
    validateRequired(formData.get('email'), 'E-posta');
    validateFile(file);
  } catch (error) {
    setMessage(error.message, 'error');
    return;
  }

  if (!file) {
    setMessage('Dosya bulunamadı.', 'error');
    return;
  }

  toggleForm(true);
  setMessage('Gönderiliyor, lütfen bekleyin...');

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json().catch(() => ({ ok: false, error: 'Geçersiz yanıt' }));

    if (!response.ok || !data.ok) {
      const errorMessage = data && data.error ? data.error : `İstek başarısız (HTTP ${response.status})`;
      setMessage(errorMessage, 'error');
      return;
    }

    setMessage('Talebiniz alındı, en kısa sürede sizinle iletişime geçeceğiz.', 'success');
    form.reset();
  } catch (error) {
    console.error('İstek başarısız', error);
    setMessage('Şu anda isteğiniz gönderilemiyor. Lütfen daha sonra tekrar deneyin.', 'error');
  } finally {
    toggleForm(false);
  }
}

if (form) {
  form.addEventListener('submit', submitForm);
}
