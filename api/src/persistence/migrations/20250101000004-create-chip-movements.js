module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chip_movements', {
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
        onDelete: 'CASCADE'
      },
      related_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      type: {
        type: Sequelize.ENUM(
          'SELL_TO_PLAYER',
          'BUY_FROM_ADMIN',
          'PRIZE',
          'LOSS',
          'WITHDRAWAL',
          'DEPOSIT',
          'RECOVERY',
          'ADJUSTMENT',
          'PANEL_ASSIGNMENT',
          'PANEL_SALE'
        ),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      previous_balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      new_balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('chip_movements', ['user_id']);
    await queryInterface.addIndex('chip_movements', ['related_user_id']);
    await queryInterface.addIndex('chip_movements', ['type']);
    await queryInterface.addIndex('chip_movements', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('chip_movements');
  }
};
