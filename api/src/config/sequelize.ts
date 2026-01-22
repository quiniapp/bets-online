import { Sequelize } from 'sequelize';
import { config } from './index';

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
  logging: config.server.env === 'development' ? console.log : false,
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
