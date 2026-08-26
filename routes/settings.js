const express = require('express');
const router = express.Router();
const { readTable, writeTable } = require('../utils/db');
const { requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const settings = await readTable('settings');
  const defaults = { heroImage: null };
  res.json(Array.isArray(settings) ? defaults : { ...defaults, ...settings });
});

router.put('/', requireAdmin, async (req, res) => {
  const current = await readTable('settings');
  const currentObj = Array.isArray(current) ? {} : current;
  const updated = { ...currentObj, ...req.body };
  await writeTable('settings', updated);
  res.json(updated);
});

module.exports = router;