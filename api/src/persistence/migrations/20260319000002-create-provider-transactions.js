'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      provider_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      provider_transaction_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      provider_game_round_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      provider_game_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      provider_player_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      transaction_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      bet_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      game_round_status: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(15, 4),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      balance_after: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      bet_outcome_event_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

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
      ['provider_name', 'provider_transaction_id'],
      {
        name: 'idx_provider_tx_reversal_lookup'
      }
    );

    await queryInterface.addIndex('provider_transactions', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('provider_transactions');
  }
};
