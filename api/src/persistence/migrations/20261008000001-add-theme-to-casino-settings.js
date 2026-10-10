'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('casino_settings', 'theme', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'dark',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('casino_settings', 'theme');
  },
};