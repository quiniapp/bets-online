'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addIndex('games', ['sort_order']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('games', ['sort_order']);
    await queryInterface.removeColumn('games', 'sort_order');
  }
};
