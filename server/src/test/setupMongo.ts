// Shared in-memory Mongo bootstrap for integration-style unit tests.
// Pins a version that matches the sandbox's Ubuntu (Ubuntu 22.04 binary works
// on Ubuntu 24 too); mongodb-memory-server tries to auto-detect the OS which
// occasionally 404s in fresh sandbox images.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

let mongod: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14',
      // Force a known-good linux download URL (Ubuntu 22.04 x86_64) if needed.
      systemBinary: process.env.MONGOMS_SYSTEM_BINARY,
    },
  });
  await mongoose.connect(mongod.getUri());
}, 120_000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) await collections[key].deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});
