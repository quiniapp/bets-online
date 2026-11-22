// Liquidaciones con flujo de fichas: el owner entrega fichas al cajero, el
// cajero las vende, y al liquidar se cobra venta − comisión, se retiran las
// fichas de premios y (opcionalmente) las no vendidas. La deuda no cobrada se
// arrastra a la liquidación siguiente. Los cobros se guardan aparte para poder
// registrar cobros posteriores y armar la caja del owner.
//
// Todas las columnas nuevas son nullable: las liquidaciones viejas (modelo de
// comisión pagada al cajero) quedan con null.

const DECIMAL_COLUMNS = [
  'commission',
  'subtotal',
  'previous_debt',
  'total_due',
  'collected',
  'debt_carried',
  'chips_delivered',
  'chip_balance_before',
  'prize_chips_recovered',
  'unsold_chips',
  'chips_left',
  'unsold_chips_recovered'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      for (const column of DECIMAL_COLUMNS) {
        await queryInterface.addColumn(
          'cashier_settlements',
          column,
          { type: Sequelize.DECIMAL(15, 2), allowNull: true },
          { transaction }
        );
      }

      await queryInterface.addIndex('cashier_settlements', ['cashier_id', 'period_end'], {
        name: 'idx_cashier_settlements_cashier_period_end',
        transaction
      });

      await queryInterface.createTable(
        'cashier_collections',
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false
          },
          settlement_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'cashier_settlements', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          cashier_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          amount: {
            type: Sequelize.DECIMAL(15, 2),
            allowNull: false
          },
          payment_reference: {
            type: Sequelize.STRING(255),
            allowNull: true
          },
          created_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()')
          }
        },
        { transaction }
      );

      await queryInterface.addIndex('cashier_collections', ['settlement_id'], { transaction });
      await queryInterface.addIndex('cashier_collections', ['cashier_id', 'created_at'], {
        transaction
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable('cashier_collections', { transaction });
      await queryInterface.removeIndex(
        'cashier_settlements',
        'idx_cashier_settlements_cashier_period_end',
        { transaction }
      );
      for (const column of DECIMAL_COLUMNS) {
        await queryInterface.removeColumn('cashier_settlements', column, { transaction });
      }
    });
  }
};
