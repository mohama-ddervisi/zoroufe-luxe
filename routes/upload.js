const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { requireAdmin } = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// چون دیگه فایل رو رو دیسک ذخیره نمی‌کنیم، از حافظه (memory) استفاده می‌کنیم
// و مستقیم به Cloudinary می‌فرستیمش
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // حداکثر ۵ مگابایت
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('فقط فایل‌های jpg، png یا webp مجازن'));
    cb(null, true);
  }
});

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'zoroufe' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// POST /api/upload  (فقط ادمین) - بادی: form-data با فیلد "image"
// خروجی: { url: "https://res.cloudinary.com/.../zoroufe/xxxx.jpg" }
router.post('/', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'آپلود عکس با خطا مواجه شد' });
    }
    if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });

    try {
      const result = await uploadToCloudinary(req.file.buffer);
      res.json({ url: result.secure_url });
    } catch (uploadErr) {
      console.error(uploadErr);
      res.status(500).json({ error: 'آپلود به سرویس عکس با خطا مواجه شد' });
    }
  });
});

module.exports = router;