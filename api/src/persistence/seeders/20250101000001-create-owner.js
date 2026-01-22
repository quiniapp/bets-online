const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if owner already exists
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'OWNER' LIMIT 1"
    );

    if (results.length > 0) {
      console.log('Owner user already exists, skipping...');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('password', 10);

    // Create owner user
    await queryInterface.bulkInsert('users', [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        parent_user_id: null,
        role: 'OWNER',
        username: 'owner',
        email: 'owner@casino.com',
        password_hash: passwordHash,
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Get the owner ID
    const [owner] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE username = 'owner' LIMIT 1"
    );

    const ownerId = owner[0].id;

    // Create balance for owner
    await queryInterface.bulkInsert('balances', [
      {
        id: Sequelize.literal('uuid_generate_v4()'),
        user_id: ownerId,
        chip_balance: 0,
        last_updated_at: new Date()
      }
    ]);

    console.log('✅ Owner user created successfully');
    console.log('   Username: owner');
    console.log('   Password: password');
    console.log('   Email: owner@casino.com');
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { username: 'owner' }, {});
  }
};
