import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'bookmytable';

if (!uri) {
  throw new Error('MONGODB_URI is not defined in .env');
}

const client = new MongoClient(uri);

let db: Db;
let connectPromise: Promise<Db> | null = null;

export const connectDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  // Prevent multiple concurrent connection attempts
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      await client.connect();
      db = client.db(dbName);
      console.log(`Connected to MongoDB database: ${dbName}`);
      return db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      connectPromise = null; // Reset on error so next call tries again
      throw error;
    }
  })();

  return connectPromise;
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB first.');
  }

  return db;
};

export const ensureConnected = async (): Promise<Db> => {
  if (!db) {
    return connectDB();
  }
  return db;
};
