import mongoose from 'mongoose';
import { ensureInitialData } from './autoSeed.js';

let memoryServerInstance = null;

// Helper to mask sensitive credentials in connection string for logging
const maskMongoUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_fashion';

  mongoose.connection.on('connected', () => {
    console.log(`[Database] MongoDB Connected to host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Database Error] Connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database Warning] MongoDB disconnected.');
  });

  try {
    console.log(`[Database] Attempting connection to ${maskMongoUri(uri)}...`);
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 4000
    });
    
    // Ensure default administrator, store settings and sample apparel exist
    await ensureInitialData();
    return conn;
  } catch (error) {
    console.warn(`[Database Warning] Primary MongoDB connection failed (${error.message}).`);
    console.log(`[Database] Initializing local in-memory MongoDB fallback engine...`);

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const fallbackUri = memoryServerInstance.getUri();

      const fallbackConn = await mongoose.connect(fallbackUri, {
        autoIndex: true
      });

      console.log(`[Database Fallback] ✅ Connected to local MongoDB fallback at ${fallbackUri}`);
      
      // Seed default admin and data into the active connection
      await ensureInitialData();

      console.log(`----------------------------------------------------------------`);
      console.log(`✨ [Aura Fashion Admin Ready]`);
      console.log(`   Email:    admin@aurafashion.com`);
      console.log(`   Password: AuraAdmin@2026`);
      console.log(`----------------------------------------------------------------`);

      return fallbackConn;
    } catch (fallbackError) {
      console.error(`[Database Error] Critical: Failed to start fallback MongoDB engine: ${fallbackError.message}`);
      return null;
    }
  }
};

export default connectDB;
