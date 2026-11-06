import mongoose from 'mongoose';

// Helper to mask sensitive credentials in connection string for logging
const maskMongoUri = (uri) => {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aura_fashion';

  mongoose.connection.on('connected', () => {
    console.log(`[Database] MongoDB Connected successfully to host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Database Error] Connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database Warning] MongoDB disconnected. Attempting reconnection...');
  });

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000
    });
    return conn;
  } catch (error) {
    console.error(`[Database Error] Initial connection to ${maskMongoUri(uri)} failed: ${error.message}`);
    // Allow application to run in fallback/offline mode if external Atlas is not reached immediately
    return null;
  }
};
