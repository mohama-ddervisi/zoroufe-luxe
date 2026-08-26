require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { writeTable, connectDB } = require('./utils/db');

async function migrate() {
  await connectDB();

  const dataDir = path.join(__dirname, 'data');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const tableName = file.replace('.json', '');
    const content = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    await writeTable(tableName, content);
    console.log(`✅ ${tableName}: منتقل شد`);
  }

  console.log('\n🎉 انتقال کامل شد!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ خطا تو انتقال:', err);
  process.exit(1);
});