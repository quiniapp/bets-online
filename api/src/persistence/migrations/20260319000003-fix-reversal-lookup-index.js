'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex('provider_transactions', 'idx_provider_tx_reversal_lookup');
    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id', 'transaction_type'],
      { name: 'idx_provider_tx_reversal_lookup' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('provider_transactions', 'idx_provider_tx_reversal_lookup');
    await queryInterface.addIndex(
      'provider_transactions',
      ['provider_name', 'provider_transaction_id'],
      { name: 'idx_provider_tx_reversal_lookup' }
    );
  }
};
