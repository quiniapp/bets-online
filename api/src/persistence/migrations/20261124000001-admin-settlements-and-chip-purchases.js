// Liquidaciones por jerarquía y compra de fichas de los admins.
//
// - cashier_compensation_modes.prizes_affect_subtotal: el que liquida (admin u
//   owner con cajeros a cargo) elige por cajero si los premios se descuentan
//   del subtotal (el cajero paga los premios con lo que vendió).
// - cashier_settlements.prizes_deducted: copia del flag al momento de liquidar.
// - admin_chip_pricing: tramos de precio diferencial por admin (si no hay fila,
//   se usan los tramos por defecto de helper).
// - admin_chip_purchases: cada carga de fichas del owner a un admin, con su
//   precio. El pago queda PENDING hasta que el owner lo confirma.

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(
        'cashier_compensation_modes',
        'prizes_affect_subtotal',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      );
      await queryInterface.addColumn(
        'cashier_settlements',
        'prizes_deducted',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      );

      await queryInterface.createTable(
        'admin_chip_pricing',
        {
          admin_id: {
            type: Sequelize.UUID,
            primaryKey: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          tiers: { type: Sequelize.JSONB, allowNull: false },
          updated_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        },
        { transaction }
      );

      await queryInterface.createTable(
        'admin_chip_purchases',
        {
          id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
          receipt_number: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, unique: true },
          admin_id: {
            type: Sequelize.UUID,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          chips: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
          percentage: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
          amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
          manual_percentage: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'PENDING' },
          chip_movement_id: { type: Sequelize.UUID, allowNull: true },
          payment_reference: { type: Sequelize.STRING(255), allowNull: true },
          notes: { type: Sequelize.TEXT, allowNull: true },
          created_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          confirmed_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          confirmed_at: { type: Sequelize.DATE, allowNull: true },
          canceled_by: {
            type: Sequelize.UUID,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          canceled_at: { type: Sequelize.DATE, allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
          updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
        },
        { transaction }
      );
      await queryInterface.addIndex('admin_chip_purchases', ['admin_id', 'status', 'created_at'], {
        name: 'idx_admin_chip_purchases_admin_status_created',
        transaction
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.dropTable('admin_chip_purchases', { transaction });
      await queryInterface.dropTable('admin_chip_pricing', { transaction });
      await queryInterface.removeColumn('cashier_settlements', 'prizes_deducted', { transaction });
      await queryInterface.removeColumn('cashier_compensation_modes', 'prizes_affect_subtotal', {
        transaction
      });
    });
  }
};
