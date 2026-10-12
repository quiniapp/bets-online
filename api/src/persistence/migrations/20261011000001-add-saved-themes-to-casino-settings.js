'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('casino_settings', 'saved_themes', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: [],
    });
    await queryInterface.addColumn('casino_settings', 'active_theme_id', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('casino_settings', 'active_theme_id');
    await queryInterface.removeColumn('casino_settings', 'saved_themes');
  },
};
