'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_favorite_games', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      game_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'games', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('user_favorite_games', ['user_id', 'game_id'], {
      unique: true,
      name: 'user_favorite_games_user_id_game_id_unique'
    });

    await queryInterface.addIndex('user_favorite_games', ['user_id'], {
      name: 'user_favorite_games_user_id_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_favorite_games');
  }
};
