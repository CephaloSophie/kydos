import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import './models.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://root:toor@127.0.0.1:27017/belote15?authSource=admin';

const ADMIN_USERNAME = process.argv[2] || 'admin';
const ADMIN_PASSWORD = process.argv[3] || 'admin123';
const ADMIN_EMAIL = process.argv[4] || 'admin@kydos.local';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const UserModel = mongoose.model('User');

  const existing = await UserModel.findOne({ username: ADMIN_USERNAME }).lean() as any;
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`User "${ADMIN_USERNAME}" already exists with role admin. Nothing to do.`);
    } else {
      await UserModel.updateOne({ _id: existing._id }, { $set: { role: 'admin' } });
      console.log(`User "${ADMIN_USERNAME}" upgraded to admin.`);
    }
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await UserModel.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'admin',
      wallet: { tokens: 0, transactions: [] },
    });
    console.log(`Admin user "${ADMIN_USERNAME}" created with password "${ADMIN_PASSWORD}".`);
  }

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
