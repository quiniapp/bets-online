'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('game_launches', {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('game_launches', ['game_id'], { name: 'idx_game_launches_game_id' });
    await queryInterface.addIndex('game_launches', ['user_id'], { name: 'idx_game_launches_user_id' });
    await queryInterface.addIndex('game_launches', ['created_at'], { name: 'idx_game_launches_created_at' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('game_launches');
  }
};
