'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'provider_game_id', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await queryInterface.addColumn('games', 'provider_name', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    await queryInterface.addColumn('games', 'default_logo', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('games', 'game_type', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('games', 'game_type');
    await queryInterface.removeColumn('games', 'default_logo');
    await queryInterface.removeColumn('games', 'provider_name');
    await queryInterface.removeColumn('games', 'provider_game_id');
  }
};
