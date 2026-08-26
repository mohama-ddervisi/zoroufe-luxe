const express = require('express');
const router = express.Router();
const { readTable, writeTable } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const { requireAdmin } = require('../middleware/auth');

// GET /api/products
router.get('/', async (req, res) => {
  let products = await readTable('products');
  const { cat, subcategory, minPrice, maxPrice, sort, search, brand, minRating, discount } = req.query;

  if (cat) products = products.filter(p => p.category === cat);

  if (subcategory) {
    const wanted = subcategory.split(',');
    products = products.filter(p => wanted.includes(p.subcategory));
  }

  if (brand) {
    const wanted = brand.split(',');
    products = products.filter(p => wanted.includes(p.brand));
  }

  if (minPrice) products = products.filter(p => p.price >= Number(minPrice));
  if (maxPrice) products = products.filter(p => p.price <= Number(maxPrice));

  if (minRating) products = products.filter(p => (p.rating || 0) >= Number(minRating));

  if (discount === '1') products = products.filter(p => p.oldPrice && p.oldPrice > p.price);

  if (search) {
    const q = search.trim();
    products = products.filter(p => p.name.includes(q));
  }

  switch (sort) {
    case 'cheap': products = [...products].sort((a, b) => a.price - b.price); break;
    case 'expensive': products = [...products].sort((a, b) => b.price - a.price); break;
    case 'bestselling': products = [...products].sort((a, b) => b.soldCount - a.soldCount); break;
    default: break;
  }

    const totalCount = products.length;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 24;
  const startIndex = (page - 1) * limit;
  const paginatedProducts = products.slice(startIndex, startIndex + limit);

  res.json({ count: totalCount, page, totalPages: Math.ceil(totalCount / limit), products: paginatedProducts });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const products = await readTable('products');
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'محصول پیدا نشد' });
  res.json(product);
});

// POST /api/products  (فقط ادمین)
router.post('/', requireAdmin, async (req, res) => {
  const products = await readTable('products');
  const newProduct = {
    id: 'p-' + uuidv4().slice(0, 8),
    name: req.body.name,
    category: req.body.category,
    subcategory: req.body.subcategory,
    brand: req.body.brand || null,
    price: Number(req.body.price),
    oldPrice: req.body.oldPrice ? Number(req.body.oldPrice) : null,
    rating: 0,
    reviewCount: 0,
    soldCount: 0,
    description: req.body.description || '',
    images: req.body.images || [],
    specs: req.body.specs || {},
    options: req.body.options || null
  };
  products.push(newProduct);
  await writeTable('products', products);
  res.status(201).json(newProduct);
});

// PUT /api/products/:id  (فقط ادمین)
router.put('/:id', requireAdmin, async (req, res) => {
  const products = await readTable('products');
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'محصول پیدا نشد' });

  products[index] = { ...products[index], ...req.body, id: products[index].id };
  await writeTable('products', products);
  res.json(products[index]);
});

// DELETE /api/products/:id  (فقط ادمین)
router.delete('/:id', requireAdmin, async (req, res) => {
  const products = await readTable('products');
  const filtered = products.filter(p => p.id !== req.params.id);
  if (filtered.length === products.length) return res.status(404).json({ error: 'محصول پیدا نشد' });
  await writeTable('products', filtered);
  res.json({ success: true });
});

module.exports = router;