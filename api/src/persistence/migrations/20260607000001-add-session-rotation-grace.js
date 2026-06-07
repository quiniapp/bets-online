'use strict';

/**
 * Adds a short grace window to refresh-token rotation so that two concurrent
 * refreshes sharing the same cookie (e.g. multiple tabs) don't fail/log the
 * user out. `previous_refresh_token` + `rotated_at` let us recognise the
 * just-rotated token and return the tokens the first request produced.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('sessions', 'previous_refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('sessions', 'rotated_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addIndex('sessions', ['previous_refresh_token']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('sessions', ['previous_refresh_token']);
    await queryInterface.removeColumn('sessions', 'rotated_at');
    await queryInterface.removeColumn('sessions', 'previous_refresh_token');
  }
};
