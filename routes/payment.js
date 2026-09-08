const express = require('express');
const router = express.Router();
const db = require('../utils/db');

const ZIBAL_MERCHANT = process.env.ZIBAL_MERCHANT;
const CALLBACK_URL = process.env.ZIBAL_CALLBACK_URL;

// ۱) شروع پرداخت برای یک سفارش
router.post('/start', async (req, res) => {
  try {
    const { orderId } = req.body;
    const orders = await db.readTable('orders');
    const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);

    if (!order) return res.status(404).json({ message: 'سفارش پیدا نشد' });
    if (order.status === 'paid') {
      return res.status(400).json({ message: 'این سفارش قبلاً پرداخت شده' });
    }

   const amountRial = order.total * 10;

    const response = await fetch('https://gateway.zibal.ir/v1/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant: ZIBAL_MERCHANT,
        amount: amountRial,
        callbackUrl: `${CALLBACK_URL}?orderId=${order.id}`,
        description: `پرداخت سفارش ${order.orderNumber}`,
        orderId: order.orderNumber
      })
    });
    const data = await response.json();

    if (data.result !== 100) {
      return res.status(400).json({ message: 'خطا در ایجاد تراکنش', detail: data.message });
    }

    order.trackId = data.trackId;
    order.status = 'pending_payment';
    await db.writeTable('orders', orders);

    res.json({ paymentUrl: `https://gateway.zibal.ir/start/${data.trackId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'خطای سرور در اتصال به درگاه' });
  }
});

// ۲) بازگشت از درگاه + تایید تراکنش
router.get('/callback', async (req, res) => {
  const { trackId, success, orderId } = req.query;
  const orders = await db.readTable('orders');
  const order = orders.find(o => o.id === orderId);

  if (!order) return res.redirect('/11-order-tracking.html?error=notfound');

  if (success !== '1') {
    order.status = 'payment_failed';
    await db.writeTable('orders', orders);
    return res.redirect(`/11-order-tracking.html?orderNumber=${order.orderNumber}&status=failed`);
  }

  try {
    const response = await fetch('https://gateway.zibal.ir/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchant: ZIBAL_MERCHANT, trackId })
    });
    const data = await response.json();

    if (data.result === 100 || data.result === 201) {
      if (data.amount !== order.total * 10) {
        order.status = 'payment_mismatch';
      } else {
        order.status = 'paid';
        order.paidAt = new Date().toISOString();
        order.refNumber = data.refNumber;
      }
    } else {
      order.status = 'payment_failed';
    }
    await db.writeTable('orders', orders);

    return res.redirect(`/11-order-tracking.html?orderNumber=${order.orderNumber}&status=${order.status}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/11-order-tracking.html?orderNumber=${order.orderNumber}&status=error`);
  }
});

module.exports = router;