'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('provider_game_type_orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // Loose strings on purpose: games.provider_name / games.game_type are
      // loose strings too; orphan rules are inert (ORDER BY falls back).
      provider_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      game_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    // Doubles as the lookup index used by the games ORDER BY subquery.
    await queryInterface.addConstraint('provider_game_type_orders', {
      fields: ['provider_name', 'game_type'],
      type: 'unique',
      name: 'provider_game_type_orders_provider_type_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'provider_game_type_orders',
      'provider_game_type_orders_provider_type_unique'
    );
    await queryInterface.dropTable('provider_game_type_orders');
  },
};
