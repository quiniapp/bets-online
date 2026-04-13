module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chip_movements', 'idempotency_key', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('chip_movements', 'idempotency_key');
  }
};
