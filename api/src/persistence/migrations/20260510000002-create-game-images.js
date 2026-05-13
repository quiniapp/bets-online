'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('game_images', {
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
      url: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      label: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('game_images', ['game_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_images');
  }
};
