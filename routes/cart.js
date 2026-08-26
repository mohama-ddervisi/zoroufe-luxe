const express = require('express');
const router = express.Router();
const { readTable, writeTable } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

async function resolveCart(cart) {
  const products = await readTable('products');
  const coupons = await readTable('coupons');

  const items = cart.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return null;
    return {
      itemId: item.itemId,
      productId: product.id,
      name: product.name,
      price: product.price,
      qty: item.qty,
      selectedColor: item.selectedColor || null,
      selectedSize: item.selectedSize || null,
      lineTotal: product.price * item.qty
    };
  }).filter(Boolean);

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  let discount = 0;
  let appliedCoupon = null;
  if (cart.couponCode) {
    const coupon = coupons.find(c => c.code === cart.couponCode && c.active);
    if (coupon) {
      discount = coupon.type === 'percent' ? Math.round(subtotal * (coupon.value / 100)) : coupon.value;
      appliedCoupon = coupon.code;
    }
  }

  return {
    id: cart.id,
    items,
    subtotal,
    discount,
    total: subtotal - discount,
    couponCode: appliedCoupon
  };
}

// POST /api/cart - ساخت یه سبد خرید جدید و خالی
router.post('/', async (req, res) => {
  const carts = await readTable('carts');
  const newCart = { id: uuidv4(), items: [], couponCode: null, createdAt: new Date().toISOString() };
  carts.push(newCart);
  await writeTable('carts', carts);
  res.status(201).json(await resolveCart(newCart));
});

// GET /api/cart/:id
router.get('/:id', async (req, res) => {
  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === req.params.id);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });
  res.json(await resolveCart(cart));
});

// POST /api/cart/:id/items - افزودن محصول به سبد
router.post('/:id/items', async (req, res) => {
  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === req.params.id);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });

  const products = await readTable('products');
  const product = products.find(p => p.id === req.body.productId);
  if (!product) return res.status(404).json({ error: 'محصول پیدا نشد' });

  const qty = Math.max(1, Number(req.body.qty) || 1);

  const existing = cart.items.find(i =>
    i.productId === product.id &&
    i.selectedColor === (req.body.selectedColor || null) &&
    i.selectedSize === (req.body.selectedSize || null)
  );

  if (existing) {
    existing.qty += qty;
  } else {
    cart.items.push({
      itemId: uuidv4(),
      productId: product.id,
      qty,
      selectedColor: req.body.selectedColor || null,
      selectedSize: req.body.selectedSize || null
    });
  }

  await writeTable('carts', carts);
  res.status(201).json(await resolveCart(cart));
});

// PUT /api/cart/:id/items/:itemId - تغییر تعداد
router.put('/:id/items/:itemId', async (req, res) => {
  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === req.params.id);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });

  const item = cart.items.find(i => i.itemId === req.params.itemId);
  if (!item) return res.status(404).json({ error: 'این آیتم تو سبد خرید نیست' });

  const qty = Number(req.body.qty);
  if (qty < 1) {
    cart.items = cart.items.filter(i => i.itemId !== req.params.itemId);
  } else {
    item.qty = qty;
  }

  await writeTable('carts', carts);
  res.json(await resolveCart(cart));
});

// DELETE /api/cart/:id/items/:itemId
router.delete('/:id/items/:itemId', async (req, res) => {
  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === req.params.id);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });

  cart.items = cart.items.filter(i => i.itemId !== req.params.itemId);
  await writeTable('carts', carts);
  res.json(await resolveCart(cart));
});

// POST /api/cart/:id/coupon - بادی: { code }
router.post('/:id/coupon', async (req, res) => {
  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === req.params.id);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });

  const coupons = await readTable('coupons');
  const coupon = coupons.find(c => c.code === (req.body.code || '').toUpperCase() && c.active);
  if (!coupon) return res.status(400).json({ error: 'کد تخفیف نامعتبر است' });

  cart.couponCode = coupon.code;
  await writeTable('carts', carts);
  res.json(await resolveCart(cart));
});

// DELETE /api/cart/:id/coupon
router.delete('/:id/coupon', async (req, res) => {
  const carts = await readTable('carts');
  const cart = carts.find(c => c.id === req.params.id);
  if (!cart) return res.status(404).json({ error: 'سبد خرید پیدا نشد' });

  cart.couponCode = null;
  await writeTable('carts', carts);
  res.json(await resolveCart(cart));
});

module.exports = router;
module.exports.resolveCart = resolveCart;