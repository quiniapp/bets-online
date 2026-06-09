'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE game_banners ALTER COLUMN game_id DROP NOT NULL;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE game_banners ALTER COLUMN game_id SET NOT NULL;'
    );
  }
};
