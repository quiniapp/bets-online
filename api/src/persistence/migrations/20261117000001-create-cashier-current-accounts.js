module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cashier_current_accounts', {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      pass: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      successes: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      claims: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      previous_balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      collections: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      paid: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      drag: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      leave: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      cashier_commission: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      bills: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      revenue: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      previous_drag: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      is_liquidated: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addConstraint('cashier_current_accounts', {
      fields: ['cashier_id', 'date'],
      type: 'unique',
      name: 'cashier_current_accounts_cashier_date_uniq'
    });

    await queryInterface.addIndex('cashier_current_accounts', ['date']);
    await queryInterface.addIndex('cashier_current_accounts', ['is_liquidated']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cashier_current_accounts');
  }
};
