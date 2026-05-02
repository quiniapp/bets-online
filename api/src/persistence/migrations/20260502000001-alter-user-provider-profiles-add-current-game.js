module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_provider_profiles', 'current_provider_game_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_provider_profiles', 'current_provider_game_id');
  }
};
