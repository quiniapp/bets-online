import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
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
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.server.env !== 'test') {
  app.use(morgan('dev'));
}

// Swagger documentation
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// API routes (global rate limiter applied to all endpoints)
app.use('/api', globalLimiter, routes);

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
