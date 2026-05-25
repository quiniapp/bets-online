import crypto from 'crypto';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { testConnection } from './config/database';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import routes from './routes';
import viralCallbackRoutes from './routes/integrations/21viral/callbacks';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { globalLimiter } from './middleware/rateLimiter.middleware';
import { startGameSyncJob } from './cron/gameSyncJob';
import { startCacheSyncJob } from './cron/cacheSyncJob';
import { warmupCache } from './utils/cache-warmup';

const app = express();

// Trust Railway/Vercel reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // lgtm[js/missing-token-validation] -- CSRF is protected by csrfMiddleware (double-submit cookie pattern) applied via app.use('/api', csrfMiddleware, routes). cookieParser is needed for JWT session cookie reads.

// CSRF protection — double-submit cookie pattern.
// Frontend: call GET /api/csrf-token to receive the cookie, then include
// the token value as the x-csrf-token header on every state-changing request.
const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Safe methods — no state change
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Bearer/HMAC auth — browser cannot forge the Authorization header cross-site
  if (req.headers.authorization) return next();
  // 21Viral provider callbacks — authenticated server-to-server HMAC calls
  if (req.path.startsWith('/integrations/21viral/players')) return next();

  const csrfHeader = req.headers[CSRF_HEADER] as string | undefined;
  const csrfCookie = (req.cookies as Record<string, string>)[CSRF_COOKIE];

  if (
    !csrfHeader ||
    !csrfCookie ||
    csrfHeader.length !== csrfCookie.length ||
    !crypto.timingSafeEqual(Buffer.from(csrfHeader), Buffer.from(csrfCookie))
  ) {
    res.status(403).json({
      success: false,
      error: { code: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' }
    });
    return;
  }

  next();
};

// Logging
if (config.server.env !== 'test') {
  app.use(morgan('dev'));
}

// Swagger documentation
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// CSRF token endpoint — sets the csrf-token cookie and returns the value.
// Must be called before any state-changing request that uses cookie auth.
app.get('/api/csrf-token', (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  const isProd = config.server.env === 'production';
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: isProd ? 'none' : 'strict',
    secure: isProd,
    path: '/'
  });
  res.json({ success: true, token });
});

// 21Viral provider callbacks — server-to-server, mounted at root to match
// the operator base URL configured in the 21Viral dashboard
app.use(viralCallbackRoutes);

// API routes (global rate limiter + CSRF protection)
app.use('/api', globalLimiter, csrfMiddleware, routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Casino Management Platform API',
    version: '1.0.1',
    documentation: `${config.server.apiUrl}/doc`
  });
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const PORT = config.server.port;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Start scheduled jobs
    startGameSyncJob();
    startCacheSyncJob();

    // Pre-warm cache so first users after deploy hit memory, not DB
    warmupCache().catch(e => console.error('[CacheWarmup] failed:', e));

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation available at ${config.server.apiUrl}/doc`);
      console.log(`🌍 Environment: ${config.server.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start the HTTP server when this file is run directly (not when imported in tests)
if (require.main === module) {
  startServer();
}

export default app;
