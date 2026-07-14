"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDB = exports.connectDB = void 0;
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'bookmytable';
if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env');
}
const client = new mongodb_1.MongoClient(uri);
let db;
const connectDB = async () => {
    if (db) {
        return db;
    }
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);
    return db;
};
exports.connectDB = connectDB;
const getDB = () => {
    if (!db) {
        throw new Error('Database not connected. Call connectDB first.');
    }
    return db;
};
exports.getDB = getDB;
//# sourceMappingURL=db.js.map