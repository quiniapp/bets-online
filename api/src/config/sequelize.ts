import { Sequelize } from 'sequelize';
import { config } from './index';
import { addDbTiming } from '../utils/request-context';
import { logger } from '../utils/logger';

if (!config.database.url) {
  throw new Error('DATABASE_URL is required');
}

// Create Sequelize instance
export const sequelize = new Sequelize(config.database.url, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: config.server.env === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  // benchmark:true makes Sequelize pass the elapsed ms as the 2nd logging arg.
  // We attribute it to the current request (addDbTiming) and emit a debug line
  // per query (hidden unless LOG_LEVEL=debug, so it's free in prod by default).
  benchmark: config.server.env !== 'test',
  logging:
    config.server.env === 'test'
      ? false
      : (sql: string, timing?: number) => {
          if (typeof timing === 'number') addDbTiming(timing);
          logger.debug({ ms: timing, sql }, 'db-query');
        },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true, // Use snake_case for auto-generated fields
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Test connection
export const testConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    throw error;
  }
};

export default sequelize;
