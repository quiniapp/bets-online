// Determinar qué archivo .env cargar basado en APP_ENV o NODE_ENV
const environment = process.env.APP_ENV || process.env.NODE_ENV || 'local';
const envFile = environment === 'production' ? '.env.production'
  : environment === 'development' ? '.env.development'
  : '.env.local';

console.log(`🔧 Sequelize CLI: Loading ${envFile}`);
require('dotenv').config({ path: envFile });

const config = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55322/postgres',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  },
  local: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55322/postgres',
    dialect: 'postgres',
    dialectOptions: {
      ssl: false
    },
    logging: console.log
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
};

module.exports = config;
