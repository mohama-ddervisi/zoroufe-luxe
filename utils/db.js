const mongoose = require('mongoose');

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // اگه ۱۰ ثانیه طول کشید و وصل نشد، زودتر خطا بده
      socketTimeoutMS: 45000,
    }).then(() => {
      console.log('✅ به دیتابیس MongoDB وصل شد');
    }).catch((err) => {
      // اگه اتصال شکست خورد، دفعه‌ی بعد دوباره اجازه‌ی تلاش بده
      connectionPromise = null;
      throw err;
    });
  }
  await connectionPromise;
}

function stripMongoFields(doc) {
  const { _id, _key, ...rest } = doc;
  return rest;
}

async function readTable(tableName) {
  await connectDB();
  const collection = mongoose.connection.db.collection(tableName);

  if (tableName === 'settings') {
    const doc = await collection.findOne({ _key: 'main' });
    return doc ? stripMongoFields(doc) : [];
  }

  const docs = await collection.find({}).toArray();
  return docs.map(stripMongoFields);
}

async function writeTable(tableName, data) {
  await connectDB();
  const collection = mongoose.connection.db.collection(tableName);

  if (tableName === 'settings') {
    await collection.updateOne({ _key: 'main' }, { $set: { ...data, _key: 'main' } }, { upsert: true });
    return;
  }

  await collection.deleteMany({});
  if (Array.isArray(data) && data.length > 0) {
    await collection.insertMany(data);
  }
}

module.exports = { readTable, writeTable, connectDB };