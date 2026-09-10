const { MongoClient } = require('mongodb');

// منبع: دیتابیس قدیمی روی Atlas
const SOURCE_URI = 'mongodb+srv://onlymohamadd_db_user:fm77x6RHGsn2oRyp@cluster0.2kmfb4b.mongodb.net/zoroufe?appName=Cluster0';

// مقصد: دیتابیس جدید روی لیارا (آدرس عمومی)
const TARGET_URI = 'mongodb://root:onR32Sgs7XRkvPb88K09bJky@alvand.liara.cloud:32997/zoroufe?authSource=admin';

// کالکشن‌هایی که باید منتقل بشن
const COLLECTIONS = ['products', 'categories', 'settings', 'contactmessages'];

async function migrate() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ به هر دو دیتابیس وصل شد');

    const sourceDb = sourceClient.db('zoroufe');
    const targetDb = targetClient.db('zoroufe');

    for (const collectionName of COLLECTIONS) {
      const docs = await sourceDb.collection(collectionName).find({}).toArray();

      if (docs.length === 0) {
        console.log(`⚪️ ${collectionName}: هیچ داده‌ای برای انتقال نبود`);
        continue;
      }

      await targetDb.collection(collectionName).insertMany(docs);
      console.log(`✅ ${collectionName}: ${docs.length} سند منتقل شد`);
    }

    console.log('🎉 مهاجرت با موفقیت تموم شد');
  } catch (err) {
    console.error('❌ خطا در مهاجرت:', err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

migrate();