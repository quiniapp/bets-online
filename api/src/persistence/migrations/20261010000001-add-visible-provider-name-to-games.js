'use strict';

/**
 * games.visible_provider_name: overrides the provider a game is shown under in
 * the frontends (filters, lists, reports). The effective provider is
 * COALESCE(visible_provider_name, provider_name); provider_name stays the real
 * one sent to 21viral. NULL = no override. Edited by SQL.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('games', 'visible_provider_name', {
        type: Sequelize.STRING(100),
        allowNull: true,
        defaultValue: null
      }, { transaction });
      // Front provider filters match on the effective provider.
      await queryInterface.sequelize.query(
        'CREATE INDEX idx_games_effective_provider ON games ((COALESCE(visible_provider_name, provider_name)))',
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_games_effective_provider', { transaction });
      await queryInterface.removeColumn('games', 'visible_provider_name', { transaction });
    });
  }
};
