# Autocad Metraj – Dosya Eki Mail Formu

AutoCAD DWG/DXF dosyalarını ve destekleyici belgeleri toplayıp e-posta ile ileten web uygulaması. Kullanıcılar dosyalarını yükleyip iletişim bilgilerini girerek metraj talebi oluşturabilir.

## 🌐 Canlı Demo
- **Web Sitesi:** https://dataautocad.vercel.app
- **Backend API:** https://dataautocad.vercel.app/api/contact-upload

## Ön yüz
1. `C:\autocad_onyuz\index.html` dosyasını tarayıcıda açın veya bir canlı sunucu ile servis edin.
2. `config.js` içindeki `CONTACT_API_URL` değişkeni backend adresini gösterir (varsayılan `http://localhost:5001/api/contact-upload`).
3. Form alanları (ad, e-posta, opsiyonel telefon/mesaj ve DWG/DXF dosyası) doldurulup gönderildiğinde frontend, dosyayı `FormData` ile backend'e POST eder.
4. Başarılı yanıt alındığında "Talebiniz alındı" mesajı gösterilir; hata mesajları backend'in döndürdüğü JSON'dan okunur.

## Backend (Node.js + Express)
1. Gereksinimler: Node.js 18+ ve npm.
2. `backend` klasöründe `package.json` hazırdır. Dizinde `npm install` komutuyla bağımlılıkları kurun (Express, Multer, Nodemailer, CORS).
3. `.env.example` dosyasını `.env` olarak kopyalayıp SMTP ve alıcı bilgilerini doldurun:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` – Outlook, Office365 vb. kimlik bilgileri.
   - `MAIL_FROM` (opsiyonel, aksi halde SMTP kullanıcı adı kullanılır) ve `MAIL_TO`.
   - `ALLOWED_ORIGINS` virgülle ayrılmış origin listesi (`http://localhost:5173` vb.). `file://` ile açılan sayfalar `null` origin olarak kabul edildiği için otomatik izinlidir.
3. Geliştirme sırasında `npm start` komutu ile backend'i dinlemeye alın (varsayılan port 5001). Konsolda başarılı yüklemeler `New contact-upload: ...` şeklinde kayıt düşer.

## İstek doğrulama ve sınırlamalar
- Dosya boyutu 2 MB ile sınırlıdır; daha büyük yüklemelerde frontend gönderme yapmaz, backend ise `413 Payload Too Large` döndürür.
- Desteklenen uzantılar: DWG, DXF, ZIP, PDF, PNG, JPG. Farklı bir uzantı yollandığında `{ ok:false, error:"Unsupported file type" }` yanıtı verilir.
- SMTP hatalarında backend `500` dönüp hata mesajını JSON `error` alanına yazar. Ön yüz bu bilgiyi kullanıcıya aktarır.

## Test önerileri
1. Küçük bir `.dwg` veya `.zip` dosyası ile başarı senaryosunu doğrulayın; mail kutunuza dosya ekli iletinin düştüğünü kontrol edin.
2. 3 MB'lık bir dosya seçerek hem frontend uyarısını hem de backend'in 413 yanıtını gözlemleyin.
3. E-posta alanını boş bırakıp göndererek backend'in 400 hata mesajını test edin.
4. `.env` içindeki SMTP şifresini bilerek hatalı girerek hata yakalama ve kullanıcıya mesaj gösterimini doğrulayın.


## 🚀 Deployment

### Full Stack Deployment (Vercel)
Hem frontend hem backend tek platformda yayınlanır - **KREDİ KARTI GEREKMİYOR**

### Backend (Vercel - Kredi Kartı Gerektirmez)
Backend Vercel üzerinde ücretsiz hosting ile çalışır:

1. [Vercel.com](https://vercel.com) adresine gidin
2. "Sign Up" ile GitHub hesabınızla giriş yapın (kredi kartı istemez)
3. "Add New..." > "Project" seçin
4. `mrdoguoz/dataautocad` repository'sini seçin
5. "Deploy" butonuna tıklayın (otomatik deploy başlar)
6. Deploy tamamlandıktan sonra "Settings" > "Environment Variables" bölümüne gidin
7. Şu değişkenleri ekleyin:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_USER = ddataautocad@gmail.com
   SMTP_PASS = pjucqwqzblcldcup
   SMTP_FROM = ddataautocad@gmail.com
   MAIL_TO = mrdoguoz@gmail.com
   ALLOWED_ORIGINS = https://dataautocad.vercel.app
   ```
8. "Deployments" sekmesinden "Redeploy" yapın

✅ **Avantajlar:** Kredi kartı yok, hızlı, her zaman aktif (uyumaz)

## 🔧 Lokal Geliştirme
