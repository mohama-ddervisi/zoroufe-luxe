const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/login
// بادی: { username, password }
// اگه مطابق با ADMIN_USERNAME/ADMIN_PASSWORD تو .env باشه، یه توکن برمی‌گردونه
// که باید تو هدر Authorization: Bearer <token> روت‌های مدیریتی استفاده بشه.
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, expiresIn: '12h' });
});

module.exports = router;
