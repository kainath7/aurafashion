import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;

export const initSocket = (server, clientOrigin, adminOrigin) => {
  io = new Server(server, {
    cors: {
      origin: [clientOrigin, adminOrigin, 'http://localhost:5173', 'http://localhost:5174'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Admin joins private admin room
    socket.on('join_admin_channel', (token) => {
      try {
        if (!token) return;
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure');
        if (decoded.type === 'admin') {
          socket.join('admin_room');
          socket.emit('admin_joined', { success: true, message: 'Connected to Aura Fashion Real-Time Admin Stream' });
        }
      } catch (err) {
        socket.emit('error', 'Unauthorized socket channel attempt');
      }
    });

    // Customer joins their specific order room for live tracking updates
    socket.on('track_order', (orderId) => {
      if (orderId) {
        socket.join(`order_${orderId}`);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const getIO = () => {
  return io;
};
