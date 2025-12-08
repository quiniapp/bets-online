module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chip_panels', {
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
      buy_price_per_chip: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      sell_price_per_chip: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_chips: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      sold_chips: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('OPEN', 'FULLY_SOLD', 'SETTLED', 'CANCELED'),
        allowNull: false,
        defaultValue: 'OPEN'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      settled_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('chip_panels', ['cashier_id']);
    await queryInterface.addIndex('chip_panels', ['status']);
    await queryInterface.addIndex('chip_panels', ['created_at']);

    // Add constraint to ensure sell_price > buy_price
    await queryInterface.addConstraint('chip_panels', {
      fields: ['buy_price_per_chip', 'sell_price_per_chip'],
      type: 'check',
      name: 'check_prices',
      where: {
        sell_price_per_chip: {
          [Sequelize.Op.gt]: Sequelize.col('buy_price_per_chip')
        }
      }
    });

    // Add constraint to ensure buy_price_per_chip > 0
    await queryInterface.addConstraint('chip_panels', {
      fields: ['buy_price_per_chip'],
      type: 'check',
      name: 'check_buy_price_positive',
      where: {
        buy_price_per_chip: {
          [Sequelize.Op.gt]: 0
        }
      }
    });

    // Add constraint to ensure total_chips > 0
    await queryInterface.addConstraint('chip_panels', {
      fields: ['total_chips'],
      type: 'check',
      name: 'check_total_chips_positive',
      where: {
        total_chips: {
          [Sequelize.Op.gt]: 0
        }
      }
    });

    // Add constraint to ensure sold_chips <= total_chips and >= 0
    await queryInterface.addConstraint('chip_panels', {
      fields: ['sold_chips', 'total_chips'],
      type: 'check',
      name: 'check_sold_chips_range',
      where: {
        sold_chips: {
          [Sequelize.Op.gte]: 0,
          [Sequelize.Op.lte]: Sequelize.col('total_chips')
        }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('chip_panels');
  }
};
