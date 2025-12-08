module.exports = {
  async up(queryInterface) {
    // ===================================
    // FUNCTION: Update updated_at column
    // ===================================
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // ===================================
    // TRIGGER: Update users.updated_at
    // ===================================
    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // ===================================
    // TRIGGER: Update recoveries.updated_at
    // ===================================
    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_recoveries_updated_at
      BEFORE UPDATE ON recoveries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // ===================================
    // FUNCTION: Update balance timestamp
    // ===================================
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_balance_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.last_updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // ===================================
    // TRIGGER: Update balances.last_updated_at
    // ===================================
    await queryInterface.sequelize.query(`
      CREATE TRIGGER update_balances_timestamp
      BEFORE UPDATE ON balances
      FOR EACH ROW
      EXECUTE FUNCTION update_balance_timestamp();
    `);

    // ===================================
    // ENABLE UUID extension
    // ===================================
    await queryInterface.sequelize.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
  },

  async down(queryInterface) {
    // Drop triggers
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_recoveries_updated_at ON recoveries;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_balances_timestamp ON balances;
    `);

    // Drop functions
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS update_balance_timestamp();
    `);
  }
};
