const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { readTable, writeTable } = require('../utils/db');

// حافظه‌ی موقت کدهای تایید (چون کد فقط ۲ دقیقه اعتباره، نیازی به ذخیره‌ی دائمی نیست)
const otpStore = {}; // { phone: { code, expiresAt } }

// POST /api/user-auth/otp/request   بادی: { phone }
// یه کد ۴ رقمی می‌سازه و *فعلاً چون سرویس پیامک وصل نیست* تو ترمینال سرور چاپش می‌کنه
router.post('/otp/request', (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^09\d{9}$/.test(phone)) {
    return res.status(400).json({ error: 'شماره موبایل معتبر نیست' });
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  otpStore[phone] = { code, expiresAt: Date.now() + 2 * 60 * 1000 };

  // -------------------------------------------------------------
  // TODO: وقتی سرویس پیامک (کاوه‌نگار/ملی‌پیامک/فرازپیامک و ...) رو خریدی،
  // به‌جای این console.log باید کد رو واقعاً پیامک کنی، مثلاً:
  // await sendSms(phone, `کد تایید زوروفه: ${code}`);
  // -------------------------------------------------------------
  console.log(`\n📱 کد تایید برای ${phone}: ${code}   (تا ۲ دقیقه معتبره)\n`);

  res.json({ success: true, message: 'کد تایید ارسال شد' });
});

// POST /api/user-auth/otp/verify   بادی: { phone, code }
router.post('/otp/verify', async (req, res) => {
  const { phone, code } = req.body;
  const record = otpStore[phone];

  if (!record) return res.status(400).json({ error: 'ابتدا درخواست کد تایید بده' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ error: 'کد تایید منقضی شده، دوباره درخواست بده' });
  }
  if (record.code !== code) return res.status(400).json({ error: 'کد تایید اشتباه است' });

  delete otpStore[phone]; // کد یکبار مصرفه

 // پیدا کردن یا ساختن کاربر
  const users = await readTable('users');
  let user = users.find(u => u.phone === phone);
  if (!user) {
    user = { id: 'u-' + Date.now().toString(36), phone, createdAt: new Date().toISOString() };
    users.push(user);
    await writeTable('users', users);
  }

  const token = jwt.sign(
    { userId: user.id, phone: user.phone, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, user: { id: user.id, phone: user.phone } });
});

module.exports = router;