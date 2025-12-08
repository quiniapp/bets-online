module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('recoveries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      admin_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      related_movement_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'chip_movements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      recovery_mode: {
        type: Sequelize.ENUM('AUTO_DEDUCT_FROM_COMMISSION', 'INSTALMENTS', 'MANUAL'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'CANCELED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      amount_paid: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
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

    await queryInterface.addIndex('recoveries', ['admin_id']);
    await queryInterface.addIndex('recoveries', ['cashier_id']);
    await queryInterface.addIndex('recoveries', ['status']);
    await queryInterface.addIndex('recoveries', ['created_at']);

    // Add constraint to ensure amount > 0
    await queryInterface.addConstraint('recoveries', {
      fields: ['amount'],
      type: 'check',
      name: 'check_amount_positive',
      where: {
        amount: {
          [Sequelize.Op.gt]: 0
        }
      }
    });

    // Add constraint to ensure amount_paid >= 0 and <= amount
    await queryInterface.addConstraint('recoveries', {
      fields: ['amount_paid', 'amount'],
      type: 'check',
      name: 'check_amount_paid_range',
      where: {
        amount_paid: {
          [Sequelize.Op.gte]: 0,
          [Sequelize.Op.lte]: Sequelize.col('amount')
        }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recoveries');
  }
};
