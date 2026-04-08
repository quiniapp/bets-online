import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { doubleCsrf } from 'csrf-csrf';
import { config } from './config';
import { testConnection } from './config/database';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { globalLimiter } from './middleware/rateLimiter.middleware';

const app = express();

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
app.use(cookieParser());

// CSRF protection (double-submit cookie pattern)
// Skipped for requests using Authorization header (Bearer/HMAC — not CSRF-vulnerable)
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => config.session.secret,
  getSessionIdentifier: req => (req.cookies as Record<string, string>)['session'] ?? req.ip ?? '',
  cookieName: config.server.env === 'production' ? '__Host-csrf' : 'csrf-token',
  cookieOptions: {
    httpOnly: false,
    sameSite: 'strict',
    secure: config.server.env === 'production',
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: req => req.headers['x-csrf-token'] as string
});

const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Bearer/HMAC auth — not CSRF-vulnerable
  if (req.headers.authorization) return next();
  // 21Viral provider callbacks are HMAC-authenticated server-to-server calls
  if (req.path.startsWith('/integrations/21viral/players')) return next();
  doubleCsrfProtection(req, res, next);
};

// Logging
if (config.server.env !== 'test') {
  app.use(morgan('dev'));
}

// Swagger documentation
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// CSRF token endpoint (must come before csrfMiddleware so it can set the cookie)
app.get('/api/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

// API routes (global rate limiter + CSRF protection)
app.use('/api', globalLimiter, csrfMiddleware, routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'Casino Management Platform API',
    version: '1.0.0',
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
