'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [providerRows] = await queryInterface.sequelize.query(
      `SELECT DISTINCT provider_name FROM games WHERE provider_name IS NOT NULL`
    );

    if (providerRows.length > 0) {
      await queryInterface.bulkInsert(
        'providers',
        providerRows.map(row => ({
          id: uuidv4(),
          name: row.provider_name,
          display_name: null,
          is_active: true,
          logo_url: null,
          created_at: now,
          updated_at: now
        })),
        { ignoreDuplicates: true }
      );
    }

    const [gameTypeRows] = await queryInterface.sequelize.query(
      `SELECT DISTINCT game_type FROM games WHERE game_type IS NOT NULL`
    );

    if (gameTypeRows.length > 0) {
      await queryInterface.bulkInsert(
        'game_types',
        gameTypeRows.map(row => ({
          id: uuidv4(),
          name: row.game_type,
          display_name: null,
          created_at: now,
          updated_at: now
        })),
        { ignoreDuplicates: true }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('providers', null, {});
    await queryInterface.bulkDelete('game_types', null, {});
  }
};
