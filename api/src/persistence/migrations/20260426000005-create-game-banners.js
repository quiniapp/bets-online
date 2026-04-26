'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('game_banners', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'games', key: 'id' },
        onDelete: 'CASCADE'
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('game_banners', ['game_id']);
    await queryInterface.addIndex('game_banners', ['is_active']);
    await queryInterface.addIndex('game_banners', ['sort_order']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_banners');
  }
};
