'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('featured_games', {
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

    await queryInterface.addIndex('featured_games', ['game_id']);
    await queryInterface.addIndex('featured_games', ['is_active']);
    await queryInterface.addIndex('featured_games', ['sort_order']);
    await queryInterface.addConstraint('featured_games', {
      fields: ['game_id'],
      type: 'unique',
      name: 'featured_games_game_id_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('featured_games');
  }
};
