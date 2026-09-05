 const express = require('express');
const router = express.Router();
const { readTable } = require('../utils/db');
// GET /api/categories
router.get('/', async (req, res) => {
  res.json(await readTable('categories'));
});

module.exports = router;
 