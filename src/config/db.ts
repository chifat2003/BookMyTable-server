import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'bookmytable';

if (!uri) {
  throw new Error('MONGODB_URI is not defined in .env');
}

const client = new MongoClient(uri);

let db: Db;

export const connectDB = async (): Promise<Db> => {
  if (db) {
    return db;
  }

  await client.connect();
  db = client.db(dbName);
  console.log(`Connected to MongoDB database: ${dbName}`);

  return db;
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB first.');
  }

  return db;
};
