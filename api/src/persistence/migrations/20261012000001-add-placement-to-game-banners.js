'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('game_banners', 'placement', {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: 'hero',
    });
    await queryInterface.addIndex('game_banners', ['placement']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('game_banners', ['placement']).catch(() => {});
    await queryInterface.removeColumn('game_banners', 'placement');
  },
};
