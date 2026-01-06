module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_game_provider_blocklist', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      provider_id: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      blocked_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('user_game_provider_blocklist', ['user_id']);
    await queryInterface.addIndex('user_game_provider_blocklist', ['provider_id']);
    await queryInterface.addIndex('user_game_provider_blocklist', ['blocked_by']);

    // Add unique constraint for user_id + provider_id combination
    await queryInterface.addConstraint('user_game_provider_blocklist', {
      fields: ['user_id', 'provider_id'],
      type: 'unique',
      name: 'unique_user_provider'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_game_provider_blocklist');
  }
};
