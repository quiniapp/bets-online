'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('providers', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addIndex('providers', ['sort_order']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('providers', ['sort_order']);
    await queryInterface.removeColumn('providers', 'sort_order');
  }
};
