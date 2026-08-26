const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/auth');

// عکس‌ها تو پوشه‌ی uploads/ ذخیره می‌شن، با اسم تصادفی تا تداخل نداشته باشن
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // حداکثر ۵ مگابایت
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('فقط فایل‌های jpg، png یا webp مجازن'));
    cb(null, true);
  }
});

// POST /api/upload  (فقط ادمین) - بادی: form-data با فیلد "image"
// خروجی: { url: "/uploads/xxxx.jpg" }
router.post('/', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'آپلود عکس با خطا مواجه شد' });
    }
    if (!req.file) return res.status(400).json({ error: 'فایلی ارسال نشده' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;