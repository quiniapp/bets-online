'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('providers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      display_name: {
        type: Sequelize.STRING(150),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      logo_url: {
        type: Sequelize.TEXT,
        allowNull: true
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

    await queryInterface.addIndex('providers', ['name']);
    await queryInterface.addIndex('providers', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('providers');
  }
};
