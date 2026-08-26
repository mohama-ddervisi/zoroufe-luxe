const express = require('express');
const router = express.Router();
const { readTable, writeTable } = require('../utils/db');
const { requireUser } = require('../middleware/auth');

router.get('/', requireUser, async (req, res) => {
  const wishlist = await readTable('wishlist');
  const mine = wishlist.filter(w => w.userId === req.user.userId).map(w => w.productId);
  res.json({ productIds: mine });
});

router.post('/', requireUser, async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'شناسه محصول لازم است' });

  const wishlist = await readTable('wishlist');
  const exists = wishlist.some(w => w.userId === req.user.userId && w.productId === productId);
  if (!exists) {
    wishlist.push({ userId: req.user.userId, productId });
    await writeTable('wishlist', wishlist);
  }
  res.json({ success: true });
});

router.delete('/:productId', requireUser, async (req, res) => {
  const wishlist = await readTable('wishlist');
  const filtered = wishlist.filter(w => !(w.userId === req.user.userId && w.productId === req.params.productId));
  await writeTable('wishlist', filtered);
  res.json({ success: true });
});

module.exports = router;