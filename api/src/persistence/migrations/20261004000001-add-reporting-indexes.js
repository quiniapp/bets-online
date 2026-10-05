'use strict';

/**
 * Reporting queries join provider_transactions to games on provider_game_id
 * (top-played, top-providers, house report, game analytics) and filter/paginate
 * by created_at. Every existing provider_transactions index leads with
 * provider_name, so each of those lookups was a full scan of the table.
 * games had no index leading with provider_game_id either (only the unique
 * (provider_name, provider_game_id) constraint).
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('provider_transactions', ['provider_game_id', 'transaction_type'], {
      name: 'idx_provider_tx_game_type'
    });
    await queryInterface.addIndex('provider_transactions', ['created_at'], {
      name: 'idx_provider_tx_created_at'
    });
    await queryInterface.addIndex('games', ['provider_game_id'], {
      name: 'idx_games_provider_game_id'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('games', 'idx_games_provider_game_id');
    await queryInterface.removeIndex('provider_transactions', 'idx_provider_tx_created_at');
    await queryInterface.removeIndex('provider_transactions', 'idx_provider_tx_game_type');
  }
};
