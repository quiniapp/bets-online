module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cashier_settlements', 'compensation_type', {
      type: Sequelize.ENUM('PERCENTAGE', 'PANEL', 'FIXED', 'HYBRID'),
      allowNull: true
    });

    await queryInterface.addColumn('cashier_settlements', 'percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });

    await queryInterface.addColumn('cashier_settlements', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('cashier_settlements', 'created_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('cashier_settlements', 'paid_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('cashier_settlements', 'payment_reference', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    await queryInterface.addConstraint('cashier_settlements', {
      fields: ['percentage'],
      type: 'check',
      name: 'check_settlement_percentage',
      where: {
        percentage: {
          [Sequelize.Op.between]: [0, 100]
        }
      }
    });

    await queryInterface.addIndex('cashier_settlements', ['cashier_id', 'period_start'], {
      name: 'idx_cashier_settlements_cashier_period'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('cashier_settlements', 'idx_cashier_settlements_cashier_period');
    await queryInterface.removeConstraint('cashier_settlements', 'check_settlement_percentage');
    await queryInterface.removeColumn('cashier_settlements', 'payment_reference');
    await queryInterface.removeColumn('cashier_settlements', 'paid_by');
    await queryInterface.removeColumn('cashier_settlements', 'created_by');
    await queryInterface.removeColumn('cashier_settlements', 'notes');
    await queryInterface.removeColumn('cashier_settlements', 'percentage');
    await queryInterface.removeColumn('cashier_settlements', 'compensation_type');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_cashier_settlements_compensation_type"');
  }
};
