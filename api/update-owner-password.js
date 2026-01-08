require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

async function updateOwnerPassword() {
  console.log('🔐 Updating owner password...\n');

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Hash the password 'owner123456'
    const password = 'owner123456';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('✅ Generated password hash');

    // Update owner user
    const [results] = await sequelize.query(`
      UPDATE users
      SET password_hash = :passwordHash
      WHERE username = 'owner'
      RETURNING id, username, email, role;
    `, {
      replacements: { passwordHash }
    });

    if (results.length > 0) {
      console.log('✅ Owner password updated successfully\n');
      console.log('Credentials:');
      console.log(`  Username: ${results[0].username}`);
      console.log(`  Email: ${results[0].email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: ${results[0].role}\n`);
    } else {
      console.log('❌ Owner user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

updateOwnerPassword();
