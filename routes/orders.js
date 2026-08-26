const express = require('express');
const router = express.Router();
const { readTable, writeTable } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin, optionalUser, requireUser } = require('../middleware/auth');
const { resolveCart } = require('./cart');

function generateOrderNumber() {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `ZR-${n}`;
}

// POST /api/orders - ثبت سفارش نهایی از روی یه سبد خرید
router.post('/', optionalUser, async (req, res) => {
  const { cartId, customer, address, paymentMethod } = req.body;

  if (!cartId || !customer || !address || !paymentMethod) {
    return res.status(400).json({ error: 'اطلاعات سفارش ناقص است' });
  }
  if (!customer.firstName || !customer.lastName || !customer.phone) {
    return res.status(400).json({ error: 'اطلاعات گیرنده ناقص است' });
  }
  if (!address.city || !address.fullAddress) {
    return res.status(400).json({ error: 'آدرس تحویل ناقص است' });
  }

  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === cartId);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });

  const resolved = await resolveCart(cart);
  if (resolved.items.length === 0) {
    return res.status(400).json({ error: 'سبد خرید خالی است' });
  }

  const orders = await readTable('orders');
  const newOrder = {
    id: uuidv4(),
    orderNumber: generateOrderNumber(),
    items: resolved.items,
    subtotal: resolved.subtotal,
    discount: resolved.discount,
    total: resolved.total,
    couponCode: resolved.couponCode,
    customer,
    address,
    paymentMethod,
    userId: req.user ? req.user.userId : null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);
  await writeTable('orders', orders);

  cart.items = [];
  cart.couponCode = null;
  await writeTable('carts', carts);

  res.status(201).json(newOrder);
});

// GET /api/orders/mine/list - سفارش‌های کاربر لاگین‌کرده
router.get('/mine/list', requireUser, async (req, res) => {
  const orders = await readTable('orders');
  const mine = orders.filter(o => o.userId === req.user.userId);
  res.json({ count: mine.length, orders: [...mine].reverse() });
});

// GET /api/orders/:id - پیگیری یک سفارش (برای مشتری، بدون نیاز به ورود ادمین)
router.get('/:id', async (req, res) => {
  const orders = await readTable('orders');
  const order = orders.find(o => o.id === req.params.id || o.orderNumber === req.params.id);
  if (!order) return res.status(404).json({ error: 'سفارش پیدا نشد' });
  res.json(order);
});

// GET /api/orders - لیست همه‌ی سفارش‌ها (فقط ادمین، برای پنل مدیریت)
router.get('/', requireAdmin, async (req, res) => {
  const orders = await readTable('orders');
  res.json({ count: orders.length, orders: [...orders].reverse() });
});

// PUT /api/orders/:id/status - تغییر وضعیت سفارش (فقط ادمین)
router.put('/:id/status', requireAdmin, async (req, res) => {
  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(req.body.status)) {
    return res.status(400).json({ error: 'وضعیت نامعتبر است' });
  }

  const orders = await readTable('orders');
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'سفارش پیدا نشد' });

  order.status = req.body.status;
  await writeTable('orders', orders);
  res.json(order);
});

module.exports = router;