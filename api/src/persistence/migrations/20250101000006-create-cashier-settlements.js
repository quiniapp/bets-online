module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cashier_settlements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      cashier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      period_start: {
        type: Sequelize.DATE,
        allowNull: false
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      total_sales: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_prizes_paid: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      profit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      payable_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'PAID', 'CANCELED', 'PARTIALLY_PAID'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('cashier_settlements', ['cashier_id']);
    await queryInterface.addIndex('cashier_settlements', ['period_start']);
    await queryInterface.addIndex('cashier_settlements', ['period_end']);
    await queryInterface.addIndex('cashier_settlements', ['status']);

    // Add constraint to ensure period_end > period_start
    await queryInterface.addConstraint('cashier_settlements', {
      fields: ['period_start', 'period_end'],
      type: 'check',
      name: 'check_period',
      where: {
        period_end: {
          [Sequelize.Op.gt]: Sequelize.col('period_start')
        }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cashier_settlements');
  }
};
