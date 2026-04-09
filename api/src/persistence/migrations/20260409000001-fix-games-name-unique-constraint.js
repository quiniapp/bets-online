'use strict';

module.exports = {
  async up(queryInterface) {
    // name no debe ser globalmente único — distintos providers pueden tener juegos con el mismo nombre
    await queryInterface.removeConstraint('games', 'games_name_key');

    // El único identifier real de un juego de provider es (provider_name, provider_game_id)
    await queryInterface.addConstraint('games', {
      fields: ['provider_name', 'provider_game_id'],
      type: 'unique',
      name: 'games_provider_name_provider_game_id_key'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('games', 'games_provider_name_provider_game_id_key');

    await queryInterface.changeColumn('games', 'name', {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true
    });
  }
};
