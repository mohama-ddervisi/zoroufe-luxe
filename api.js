// ===================================================================
// ZOROUFE — لایه‌ی ارتباط فرانت‌اند با بک‌اند
// این فایل تو همه‌ی صفحات با <script src="api.js"></script> لود می‌شه
// (قبل از اسکریپت اختصاصی خود صفحه)
// ===================================================================

// آدرس بک‌اند - موقع دیپلوی روی سرور واقعی این خط رو عوض کن
const API_BASE = 'http://localhost:4000/api';

// -------------------- ابزارهای فرمت --------------------
const toFa = (n) => Number(n).toLocaleString('fa-IR');
const fmtPrice = (n) => toFa(Math.round(n)) + ' ت';

// گرادیان‌های ثابت برای جایگزین عکس محصول (چون فعلاً محصولات عکس واقعی ندارن)
const PRODUCT_GRADIENTS = [
  '150deg,#8B6CF2,#3B2E7A', '150deg,#4E9CFF,#1F4E8C', '150deg,#3EE0C4,#12766A',
  '150deg,#F2C94C,#8C6A1A', '150deg,#E86AA6,#8C2F5C', '150deg,#6AE8C7,#1F8C6C',
];
function gradFor(id) {
  let hash = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return PRODUCT_GRADIENTS[hash % PRODUCT_GRADIENTS.length];
}

// -------------------- fetch wrapper --------------------
async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* بدنه‌ی خالی */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'خطا در ارتباط با سرور');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// -------------------- محصولات و دسته‌بندی‌ها --------------------
function getProducts(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, v); });
  const q = qs.toString();
  return api('/products' + (q ? `?${q}` : ''));
}
function getProduct(id) {
  return api('/products/' + encodeURIComponent(id));
}
function getCategories() {
  return api('/categories');
}

// -------------------- سبد خرید --------------------
const CART_ID_KEY = 'zoroufe_cart_id';

async function ensureCartId() {
  let id = localStorage.getItem(CART_ID_KEY);
  if (id) return id;
  const cart = await api('/cart', { method: 'POST' });
  localStorage.setItem(CART_ID_KEY, cart.id);
  return cart.id;
}

async function getCart() {
  const id = await ensureCartId();
  try {
    return await api('/cart/' + id);
  } catch (err) {
    // اگه سبد رو سرور دیگه پیدا نشد (مثلاً دیتای بک‌اند ریست شده)، یکی جدید بساز
    if (err.status === 404) {
      localStorage.removeItem(CART_ID_KEY);
      const newId = await ensureCartId();
      return api('/cart/' + newId);
    }
    throw err;
  }
}

async function addToCart(productId, qty = 1, selectedColor = null, selectedSize = null) {
  const id = await ensureCartId();
  return api(`/cart/${id}/items`, {
    method: 'POST',
    body: JSON.stringify({ productId, qty, selectedColor, selectedSize }),
  });
}

async function updateCartItemQty(itemId, qty) {
  const id = await ensureCartId();
  return api(`/cart/${id}/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ qty }),
  });
}

async function removeCartItem(itemId) {
  const id = await ensureCartId();
  return api(`/cart/${id}/items/${itemId}`, { method: 'DELETE' });
}

async function applyCoupon(code) {
  const id = await ensureCartId();
  return api(`/cart/${id}/coupon`, { method: 'POST', body: JSON.stringify({ code }) });
}

async function removeCoupon() {
  const id = await ensureCartId();
  return api(`/cart/${id}/coupon`, { method: 'DELETE' });
}

// -------------------- سفارش --------------------
async function placeOrder({ customer, address, paymentMethod }) {
  const cartId = await ensureCartId();
  return api('/orders', {
    method: 'POST',
    body: JSON.stringify({ cartId, customer, address, paymentMethod }),
  });
}

// -------------------- بج تعداد سبد خرید تو هدر --------------------
async function refreshCartBadge() {
  try {
    const cart = await getCart();
    const totalQty = cart.items.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count, #headerCartCount, #cartCount').forEach(el => {
      el.textContent = toFa(totalQty);
    });
    return cart;
  } catch (_) {
    // اگه بک‌اند بالا نیست، بی‌سروصدا رد شو - خود صفحه پیام مناسب نشون می‌ده
  }
}
// -------------------- پیگیری سفارش با شماره سفارش --------------------
async function getOrderByNumber(orderNumber) {
  return api('/orders/' + encodeURIComponent(orderNumber));
}
// -------------------- پنل مدیریت (ادمین) --------------------
function getAdminToken() { return localStorage.getItem('zoroufe_admin_token'); }
function setAdminToken(token) { localStorage.setItem('zoroufe_admin_token', token); }
function clearAdminToken() { localStorage.removeItem('zoroufe_admin_token'); }

async function adminApi(path, options = {}) {
  const token = getAdminToken();
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const err = new Error((data && data.error) || 'خطا در ارتباط با سرور');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function adminLogin(username, password) {
  return api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}
async function adminCreateProduct(product) {
  return adminApi('/products', { method: 'POST', body: JSON.stringify(product) });
}
async function adminUpdateProduct(id, product) {
  return adminApi('/products/' + id, { method: 'PUT', body: JSON.stringify(product) });
}
async function adminDeleteProduct(id) {
  return adminApi('/products/' + id, { method: 'DELETE' });
}
async function adminGetOrders() {
  return adminApi('/orders');
}
async function adminUpdateOrderStatus(id, status) {
  return adminApi('/orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) });
}
async function adminUploadImage(file) {
  const token = getAdminToken();
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(API_BASE + '/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error((data && data.error) || 'آپلود عکس با خطا مواجه شد');
  const backendOrigin = API_BASE.replace(/\/api$/, '');
  return backendOrigin + data.url;
}

async function adminUploadImages(files) {
  const urls = [];
  for (const file of files) {
    const url = await adminUploadImage(file);
    urls.push(url);
  }
  return urls;
}
// نگاشت اسم فارسی رنگ‌های رایج به کد رنگ - برای اینکه ادمین لازم نباشه کد hex بلد باشه
const PERSIAN_COLOR_MAP = {
  'قرمز': '#E74C3C', 'آبی': '#3498DB', 'سبز': '#2ECC71', 'زرد': '#F1C40F',
  'صورتی': '#FF6FA5', 'بنفش': '#9B59B6', 'نارنجی': '#E67E22', 'مشکی': '#1C1C1E',
  'سفید': '#F5F5F5', 'طلایی': '#D4AF37', 'نقره‌ای': '#BFC1C2', 'قهوه‌ای': '#8B5A2B',
  'خاکستری': '#8E8E93', 'فیروزه‌ای': '#3EE0C4', 'سرمه‌ای': '#1F3A5F', 'کرم': '#F5E6C8',
  'بژ': '#D9C7A8', 'یاسی': '#C9A0DC', 'زرشکی': '#7D1935', 'سبزتیره': '#1B5E3A',
};
function colorNameToHex(name) {
  return PERSIAN_COLOR_MAP[name.trim()] || '#9A9AA3'; // اگه رنگ ناشناخته بود، خاکستری خنثی
}
// -------------------- تنظیمات سایت (مثل عکس هیرو) --------------------
async function getSettings() {
  return api('/settings');
}
async function adminUpdateSettings(settings) {
  return adminApi('/settings', { method: 'PUT', body: JSON.stringify(settings) });
}
// -------------------- حساب کاربری (ورود با کد تایید) --------------------
function getUserToken() { return localStorage.getItem('zoroufe_user_token'); }
function setUserToken(token) { localStorage.setItem('zoroufe_user_token', token); }
function clearUserToken() { localStorage.removeItem('zoroufe_user_token'); }
function isLoggedIn() { return !!getUserToken(); }

async function userApi(path, options = {}) {
  const token = getUserToken();
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const err = new Error((data && data.error) || 'خطا در ارتباط با سرور');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function requestOtp(phone) {
  return api('/user-auth/otp/request', { method: 'POST', body: JSON.stringify({ phone }) });
}
async function verifyOtp(phone, code) {
  const res = await api('/user-auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) });
  setUserToken(res.token);
  return res;
}

async function getWishlist() {
  return userApi('/wishlist');
}
async function addToWishlist(productId) {
  return userApi('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
}
async function removeFromWishlist(productId) {
  return userApi('/wishlist/' + productId, { method: 'DELETE' });
}
async function getMyOrders() {
  return userApi('/orders/mine/list');
}
// آیکون حساب کاربری تو ناوبار - بسته به لاگین بودن یا نبودن به جای درست وصل می‌شه
function wireAccountIcon() {
  document.querySelectorAll('#accountBtn').forEach(btn => {
    btn.href = isLoggedIn() ? '17-my-orders.html' : '15-login.html';
  });
}
// -------------------- پیام‌های فرم تماس --------------------
async function sendContactMessage(data) {
  return api('/contact', { method: 'POST', body: JSON.stringify(data) });
}
async function adminGetContactMessages() {
  return adminApi('/contact');
}
async function adminMarkMessageRead(id) {
  return adminApi('/contact/' + id + '/read', { method: 'PUT' });
}
function userLogout() {
  clearUserToken();
  window.location.href = 'index.html';
}
document.addEventListener('DOMContentLoaded', wireAccountIcon);
document.addEventListener('DOMContentLoaded', refreshCartBadge);
