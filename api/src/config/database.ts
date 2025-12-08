import { sequelize, testConnection } from './sequelize';

// Export Sequelize instance as the main database connection
export { sequelize, testConnection };

// Default export
export default sequelize;
