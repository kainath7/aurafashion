import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // fallback to default

import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './sockets/socketHandler.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB (or fallback in-memory engine) & ensure admin exists
    await connectDB();

    const server = http.createServer(app);

    // Initialize Socket.IO
    initSocket(
      server,
      process.env.CLIENT_URL || 'http://localhost:5173',
      process.env.ADMIN_URL || 'http://localhost:5174'
    );

    server.listen(PORT, () => {
      console.log(`[Aura Fashion Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`[Shop] Aura Fashion | Owner: Kainath | Bengaluru, India`);
    });
  } catch (err) {
    console.error('[Server Error] Startup failed:', err.message);
    process.exit(1);
  }
};

startServer();
