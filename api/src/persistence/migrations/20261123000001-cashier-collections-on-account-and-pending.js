// Cobros a cuenta y cobros de liquidación pendientes de confirmar.
//
// - cashier_collections.settlement_id pasa a nullable: un cobro a cuenta
//   (kind ON_ACCOUNT) se registra durante la semana sin liquidación, y se
//   vincula a la liquidación que lo descuenta.
// - kind: ON_ACCOUNT | SETTLEMENT. status: PENDING | CONFIRMED | EXPIRED | CANCELED.
//   El cobro que se fija al liquidar queda PENDING hasta que el owner lo confirma.
// - cashier_settlements.on_account_collected: cobros a cuenta descontados.
// - cashier_settlements.pending_collection: cobro esperando confirmación.
//
// Los cobros existentes quedan como SETTLEMENT / CONFIRMED (confirmed_at = created_at).

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      // SQL directo: en Postgres, changeColumn con `references` solo agrega otra
      // FK e ignora allowNull (ver 20261123000002).
      await queryInterface.sequelize.query(
        'ALTER TABLE cashier_collections ALTER COLUMN settlement_id DROP NOT NULL',
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_collections',
        'kind',
        { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'SETTLEMENT' },
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_collections',
        'status',
        { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'CONFIRMED' },
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_collections',
        'notes',
        { type: Sequelize.TEXT, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_collections',
        'confirmed_by',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_collections',
        'confirmed_at',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
      await queryInterface.sequelize.query(
        'UPDATE cashier_collections SET confirmed_at = created_at, confirmed_by = created_by WHERE confirmed_at IS NULL',
        { transaction }
      );
      await queryInterface.addIndex('cashier_collections', ['cashier_id', 'settlement_id', 'status'], {
        name: 'idx_cashier_collections_cashier_settlement_status',
        transaction
      });

      await queryInterface.addColumn(
        'cashier_settlements',
        'on_account_collected',
        { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_settlements',
        'pending_collection',
        { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn('cashier_settlements', 'pending_collection', { transaction });
      await queryInterface.removeColumn('cashier_settlements', 'on_account_collected', { transaction });
      await queryInterface.removeIndex(
        'cashier_collections',
        'idx_cashier_collections_cashier_settlement_status',
        { transaction }
      );
      // Los cobros sin liquidación o no confirmados no existen en el esquema anterior.
      await queryInterface.sequelize.query(
        "DELETE FROM cashier_collections WHERE settlement_id IS NULL OR status <> 'CONFIRMED'",
        { transaction }
      );
      for (const column of ['confirmed_at', 'confirmed_by', 'notes', 'status', 'kind']) {
        await queryInterface.removeColumn('cashier_collections', column, { transaction });
      }
      await queryInterface.sequelize.query(
        'ALTER TABLE cashier_collections ALTER COLUMN settlement_id SET NOT NULL',
        { transaction }
      );
    });
  }
};
