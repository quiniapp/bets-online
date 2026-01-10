require('dotenv').config({ path: '.env.local' });

const config = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:55322/postgres',
    dialect: 'postgres',
    dialectOptions: {
      ssl: false
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
