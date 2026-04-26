'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('game_types', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addIndex('game_types', ['sort_order']);
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('game_types', ['sort_order']);
    await queryInterface.removeColumn('game_types', 'sort_order');
  }
};
