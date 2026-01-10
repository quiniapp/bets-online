module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'games',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'WON', 'LOST', 'CANCELLED'),
        defaultValue: 'PENDING',
        allowNull: false
      },
      multiplier: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      payout: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      result_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      settled_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('bets', ['user_id']);
    await queryInterface.addIndex('bets', ['game_id']);
    await queryInterface.addIndex('bets', ['status']);
    await queryInterface.addIndex('bets', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bets');
  }
};
