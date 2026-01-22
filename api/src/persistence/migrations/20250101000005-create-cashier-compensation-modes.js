module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cashier_compensation_modes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      cashier_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('PERCENTAGE', 'PANEL', 'FIXED', 'HYBRID'),
        allowNull: false
      },
      percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      active_from: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      active_to: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    await queryInterface.addIndex('cashier_compensation_modes', ['cashier_id']);
    await queryInterface.addIndex('cashier_compensation_modes', ['active_from']);
    await queryInterface.addIndex('cashier_compensation_modes', ['active_to']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cashier_compensation_modes');
  }
};
