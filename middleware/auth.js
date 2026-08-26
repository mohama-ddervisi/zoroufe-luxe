const jwt = require('jsonwebtoken');

// این میدل‌ور جلوی روت‌های مدیریتی (اضافه/ویرایش/حذف محصول و غیره) رو می‌گیره
// و فقط اگه یه توکن معتبر (که از /api/auth/login گرفته شده) همراه درخواست باشه اجازه می‌ده.
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'برای این عملیات باید وارد پنل مدیریت شده باشی' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده است' });
  }
}

// این میدل‌ور جلوی روت‌های مخصوص کاربر لاگین‌کرده (علاقه‌مندی‌ها، سفارش‌های من) رو می‌گیره
function requireUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'برای این عملیات باید وارد حساب کاربری‌ت شده باشی' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'customer') throw new Error('not customer');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'توکن نامعتبر یا منقضی‌شده است' });
  }
}

// این میدل‌ور اختیاریه: اگه توکن معتبر بود req.user رو پر می‌کنه، وگرنه بدون خطا رد می‌شه
// برای جاهایی مثل ثبت سفارش که هم کاربر مهمون هم کاربر لاگین‌کرده باید بتونن استفاده کنن
function optionalUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.role === 'customer') req.user = payload;
    } catch (err) { /* توکن نامعتبر بود - مهمون در نظر گرفته می‌شه */ }
  }
  next();
}

module.exports = { requireAdmin, requireUser, optionalUser };
