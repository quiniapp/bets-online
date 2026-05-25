'use strict';

module.exports = {
  async up(queryInterface) {
    // ADD VALUE cannot run inside a transaction in PostgreSQL
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_chip_movements_type\" ADD VALUE IF NOT EXISTS 'GAME_BET'"
    );
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_chip_movements_type\" ADD VALUE IF NOT EXISTS 'GAME_WIN'"
    );
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_chip_movements_type\" ADD VALUE IF NOT EXISTS 'GAME_REFUND'"
    );
  },

  async down() {
    // PostgreSQL does not support removing ENUM values.
    // The values are harmless to leave in place.
    console.warn('down: GAME_BET/GAME_WIN/GAME_REFUND ENUM values cannot be removed automatically');
  }
};
