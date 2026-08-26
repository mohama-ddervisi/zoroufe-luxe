const express = require('express');
const router = express.Router();
const { readTable, writeTable } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/auth');

// POST /api/contact - عمومی، هرکسی می‌تونه پیام بفرسته
router.post('/', async (req, res) => {
  const { name, contact, message } = req.body;
  if (!name || !contact || !message) {
    return res.status(400).json({ error: 'همه‌ی فیلدها رو پر کن' });
  }

  const messages = await readTable('contactMessages');
  const newMessage = {
    id: uuidv4(),
    name,
    contact,
    message,
    read: false,
    createdAt: new Date().toISOString()
  };
  messages.push(newMessage);
  await writeTable('contactMessages', messages);

  res.status(201).json({ success: true });
});

// GET /api/contact - فقط ادمین، لیست همه‌ی پیام‌ها
router.get('/', requireAdmin, async (req, res) => {
  const messages = await readTable('contactMessages');
  res.json({ count: messages.length, messages: [...messages].reverse() });
});

// PUT /api/contact/:id/read - فقط ادمین، علامت‌گذاری خوانده‌شده
router.put('/:id/read', requireAdmin, async (req, res) => {
  const messages = await readTable('contactMessages');
  const msg = messages.find(m => m.id === req.params.id);
  if (!msg) return res.status(404).json({ error: 'پیام پیدا نشد' });
  msg.read = true;
  await writeTable('contactMessages', messages);
  res.json({ success: true });
});

module.exports = router;