'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'CREATE SEQUENCE IF NOT EXISTS viral_player_id_seq START WITH 100001 INCREMENT BY 1 NO CYCLE'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS viral_player_id_seq');
  }
};
