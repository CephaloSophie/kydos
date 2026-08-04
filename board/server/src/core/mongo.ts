import mongoose from 'mongoose';
import { environment } from './environment.js';

/** Ouvre la connexion Mongo (idempotent). */
export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(environment.mongoUri, { autoIndex: true });
  // eslint-disable-next-line no-console
  console.log(`[bord] Mongo connecté : ${environment.mongoUri.replace(/:[^:@/]+@/, ':***@')}`);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
