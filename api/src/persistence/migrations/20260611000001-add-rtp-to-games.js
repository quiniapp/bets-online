'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'rtp', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('games', 'rtp');
  }
};
