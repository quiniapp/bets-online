// Corrige 20261123000001 en las bases donde ya corrió con changeColumn:
// en Postgres, changeColumn con `references` solo agregó una FK duplicada
// (cashier_collections_settlement_id_fkey1) y dejó settlement_id NOT NULL,
// así que no se podían registrar cobros a cuenta (settlement_id null).
// Idempotente: en una base migrada con la versión corregida no cambia nada.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query(
        'ALTER TABLE cashier_collections ALTER COLUMN settlement_id DROP NOT NULL',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'ALTER TABLE cashier_collections DROP CONSTRAINT IF EXISTS cashier_collections_settlement_id_fkey1',
        { transaction }
      );
    });
  },

  // Nada que revertir: el NOT NULL lo restaura el down de 20261123000001.
  async down() {}
};
