# ZOROUFE Backend

بک‌اند فروشگاه زوروفه، با Node.js + Express. دیتابیس فعلاً فایل‌های JSON
تو پوشه‌ی `data/` هستن (بعداً قابل مهاجرت به دیتابیس واقعی).

## راه‌اندازی

```bash
npm install
cp .env.example .env
# مقادیر ADMIN_USERNAME / ADMIN_PASSWORD / JWT_SECRET رو تو .env عوض کن
npm run dev
```

سرور روی `http://localhost:4000` بالا میاد (یا هر پورتی که تو `.env` گذاشتی).

## مسیرهای API

### محصولات
| متد | مسیر | توضیح | نیاز به ورود ادمین |
|---|---|---|---|
| GET | `/api/products` | لیست محصولات (با فیلتر) | خیر |
| GET | `/api/products/:id` | جزئیات یک محصول | خیر |
| POST | `/api/products` | ساخت محصول جدید | بله |
| PUT | `/api/products/:id` | ویرایش محصول | بله |
| DELETE | `/api/products/:id` | حذف محصول | بله |

فیلترهای قابل استفاده روی `GET /api/products`:
`?cat=kitchen` `?subcategory=...` `?minPrice=` `?maxPrice=` `?sort=cheap|expensive|bestselling` `?search=...`

### دسته‌بندی‌ها
| متد | مسیر | توضیح |
|---|---|---|
| GET | `/api/categories` | لیست دسته‌بندی‌ها و زیردسته‌ها |

### سبد خرید
سبد خرید با یه `cartId` شناسایی می‌شه که کلاینت (فرانت‌اند) باید تولیدش کنه
(با `POST /api/cart`) و تو `localStorage` مرورگر نگهش داره.

| متد | مسیر | توضیح | بادی |
|---|---|---|---|
| POST | `/api/cart` | ساخت سبد خرید جدید | - |
| GET | `/api/cart/:id` | مشاهده‌ی سبد (با قیمت‌های محاسبه‌شده) | - |
| POST | `/api/cart/:id/items` | افزودن محصول | `{ productId, qty, selectedColor, selectedSize }` |
| PUT | `/api/cart/:id/items/:itemId` | تغییر تعداد | `{ qty }` |
| DELETE | `/api/cart/:id/items/:itemId` | حذف یک قلم | - |
| POST | `/api/cart/:id/coupon` | اعمال کد تخفیف | `{ code }` (برای تست: `ZOROUFE10`) |
| DELETE | `/api/cart/:id/coupon` | حذف کد تخفیف | - |

قیمت‌ها همیشه سمت سرور از `data/products.json` محاسبه می‌شن، نه از چیزی که
کلاینت می‌فرسته — این یه اصل امنیتی مهمه.

### سفارش‌ها
| متد | مسیر | توضیح | نیاز به ورود ادمین |
|---|---|---|---|
| POST | `/api/orders` | ثبت سفارش نهایی از روی یه سبد خرید | خیر |
| GET | `/api/orders/:id` | پیگیری یک سفارش (با id یا شماره سفارش) | خیر |
| GET | `/api/orders` | لیست همه‌ی سفارش‌ها (برای پنل مدیریت) | بله |
| PUT | `/api/orders/:id/status` | تغییر وضعیت سفارش | بله |

بادی `POST /api/orders`:
```json
{
  "cartId": "...",
  "customer": { "firstName": "...", "lastName": "...", "phone": "...", "email": "..." },
  "address": { "province": "...", "city": "...", "fullAddress": "...", "postalCode": "..." },
  "paymentMethod": "gateway"
}
```

### ورود ادمین
| متد | مسیر | توضیح |
|---|---|---|
| POST | `/api/auth/login` | با `{ username, password }` یه توکن می‌ده |

توکن گرفته‌شده رو تو هدر درخواست‌های مدیریتی بذار:
`Authorization: Bearer <token>`

## نکته درباره‌ی options محصولات

هر محصول یه فیلد اختیاری `options` داره:

```json
"options": {
  "colors": [{ "name": "سفید", "hex": "#F5F5F5" }],
  "sizes": ["۶ نفره", "۱۲ نفره"]
}
```

اگه محصولی نیاز به رنگ یا سایز نداره، این فیلد `null` می‌مونه — فرانت‌اند
باید طوری نوشته بشه که اگه `options` مقدار نداشت، اون بخش از صفحه‌ی محصول
اصلاً نمایش داده نشه.

## بعدی چیه؟

این نسخه محصولات، دسته‌بندی‌ها، سبد خرید، و سفارش‌ها رو پوشش می‌ده. مرحله‌ی
بعدی: وصل کردن فرانت‌اند به این API به‌جای دیتای هاردکدشده‌ی فعلی تو
جاوااسکریپت، و بعدش یه پنل مدیریت (Admin UI) برای مدیریت محصولات و سفارش‌ها.
