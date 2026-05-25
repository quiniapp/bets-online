'use strict';

// 21viral reuses providerTransactionId across different game rounds.
// The correct idempotency key must include provider_game_round_id so each
// round's bet/win is treated independently.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex(
      'provider_transactions',
      'uq_provider_transactions_idempotency'
    );

    await queryInterface.removeIndex(
      'provider_transactions',
      'idx_provider_tx_reversal_lookup'
    );

    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id', 'provider_game_round_id', 'transaction_type'],
      {
        unique: true,
        name: 'uq_provider_transactions_idempotency'
      }
    );

    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id', 'provider_game_round_id', 'transaction_type'],
      { name: 'idx_provider_tx_reversal_lookup' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'provider_transactions',
      'uq_provider_transactions_idempotency'
    );

    await queryInterface.removeIndex(
      'provider_transactions',
      'idx_provider_tx_reversal_lookup'
    );

    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id', 'transaction_type'],
      {
        unique: true,
        name: 'uq_provider_transactions_idempotency'
      }
    );

    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id', 'transaction_type'],
      { name: 'idx_provider_tx_reversal_lookup' }
    );
  }
};
