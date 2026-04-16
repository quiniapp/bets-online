module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'last_activity', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'last_activity');
  }
};
