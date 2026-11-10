/**
 * Centralized CORS origin validation for Express & Socket.IO
 * Supports:
 * - Configured CLIENT_URL and ADMIN_URL (comma-delimited or single)
 * - All Vercel deployments (*.vercel.app)
 * - Localhost and 127.0.0.1 development ports
 * - Server-to-server and mobile requests (no origin)
 */
export const isAllowedOrigin = (origin) => {
  // Allow requests with no origin (mobile apps, curl, server-to-server)
  if (!origin) return true;

  const normalizedOrigin = origin.trim().replace(/\/$/, '');

  // 1. Check environment variables (comma-separated or single)
  const envOrigins = [process.env.CLIENT_URL, process.env.ADMIN_URL]
    .filter(Boolean)
    .flatMap((val) => val.split(','))
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (envOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // 2. Allow all Vercel domains for this project and preview deployments (*.vercel.app)
  if (/^https:\/\/.*\.vercel\.app$/i.test(normalizedOrigin)) {
    return true;
  }

  // 3. Allow all Render domains (*.onrender.com)
  if (/^https:\/\/.*\.onrender\.com$/i.test(normalizedOrigin)) {
    return true;
  }

  // 4. Allow local development (localhost / 127.0.0.1 on any port)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalizedOrigin)) {
    return true;
  }

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
      callback(new Error(`Blocked by CORS policy for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

export default { isAllowedOrigin, corsOptions };
