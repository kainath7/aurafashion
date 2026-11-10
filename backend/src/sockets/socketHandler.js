import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { isAllowedOrigin } from '../config/cors.js';

let io = null;

export const initSocket = (server, clientOrigin, adminOrigin) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          console.warn('[Socket.IO CORS Blocked]:', origin);
          callback(new Error(`CORS origin not allowed: ${origin}`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Admin joins private administrative room with valid JWT
    socket.on('join_admin_channel', (token) => {
      try {
        if (!token) return;
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'aura_fashion_super_secret_jwt_key_2026_secure'
        );
        if (decoded.type === 'admin') {
          socket.join('admin_room');
          socket.emit('admin_joined', {
            success: true,
            message: 'Connected to Aura Fashion Real-Time Admin Stream'
          });
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

// Safe event emitters that do not throw if socket server isn't active
export const broadcastEvent = (eventName, data) => {
  try {
    if (io) {
      io.emit(eventName, data);
    }
  } catch (err) {
    console.warn(`[Socket Warning] Could not broadcast ${eventName}:`, err.message);
  }
};

export const emitToAdminRoom = (eventName, data) => {
  try {
    if (io) {
      io.to('admin_room').emit(eventName, data);
    }
  } catch (err) {
    console.warn(`[Socket Warning] Could not emit to admin room ${eventName}:`, err.message);
  }
};

export const emitToOrderRoom = (orderId, eventName, data) => {
  try {
    if (io && orderId) {
      io.to(`order_${orderId}`).emit(eventName, data);
    }
  } catch (err) {
    console.warn(`[Socket Warning] Could not emit to order room ${eventName}:`, err.message);
  }
};
