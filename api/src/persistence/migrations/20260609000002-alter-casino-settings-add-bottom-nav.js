'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('casino_settings', 'bottom_nav_items', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: Sequelize.literal("'[]'::jsonb"),
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('casino_settings', 'bottom_nav_items');
  },
};
