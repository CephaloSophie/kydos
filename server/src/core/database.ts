import mongoose from 'mongoose';
import { environment } from './environment.js';
import { createLogger } from './logger.js';

const logger = createLogger('database');
let inMemoryServer: { stop: () => Promise<unknown> } | null = null;

export async function connectDatabase(): Promise<void> {
  mongoose.set('bufferTimeoutMS', 8000);

  if (environment.useInMemoryDatabase) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memoryServer = await MongoMemoryServer.create();
    inMemoryServer = memoryServer;
    const uri = memoryServer.getUri('belote');
    await mongoose.connect(uri);
    logger.info('MongoDB en mémoire démarré', { uri });
    try {
      const { seedDatabase } = await import('../seed.js');
      await seedDatabase();
      logger.info('base mémoire alimentée (seed auto)');
    } catch (error) {
      logger.warn('seed auto échoué', { error: (error as Error).message });
    }
    return;
  }

  try {
    await mongoose.connect(environment.mongoUri, { serverSelectionTimeoutMS: 5000 });
    logger.info('MongoDB connecté', { uri: environment.mongoUri });
  } catch (error) {
    logger.error('connexion MongoDB échouée', {
      error: (error as Error).message,
      hint: 'Lance « docker compose up -d mongo » ou teste avec MONGO_URI=memory.',
    });
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect().catch(() => {});
  if (inMemoryServer) await inMemoryServer.stop().catch(() => {});
}
