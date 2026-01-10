module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('games', {
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
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      min_bet: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      max_bet: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      house_edge: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 2.5
      },
      provider_id: {
        type: Sequelize.STRING(100),
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

    await queryInterface.addIndex('games', ['is_active']);
    await queryInterface.addIndex('games', ['name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('games');
  }
};
