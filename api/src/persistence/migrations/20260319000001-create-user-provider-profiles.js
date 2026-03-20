'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_provider_profiles', {
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
      provider_name: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      provider_player_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'ARS'
      },
      country_code: {
        type: Sequelize.STRING(2),
        allowNull: false,
        defaultValue: 'AR'
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

    await queryInterface.addIndex('user_provider_profiles', ['user_id', 'provider_name'], {
      unique: true,
      name: 'uq_user_provider_profiles_user_provider'
    });

    await queryInterface.addIndex('user_provider_profiles', ['provider_name', 'provider_player_id'], {
      unique: true,
      name: 'uq_user_provider_profiles_provider_player'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_provider_profiles');
  }
};
