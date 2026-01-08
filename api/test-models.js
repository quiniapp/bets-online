require('dotenv').config({ path: '.env.local' });
const { Sequelize } = require('sequelize');

async function testModels() {
  console.log('🔍 Testing database connection and models...\n');

  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Test query - get all users
    const [users] = await sequelize.query('SELECT id, username, email, role, status FROM users');
    console.log(`✅ Found ${users.length} user(s):\n`);

    users.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.email} - Status: ${user.status}`);
    });

    // Test query - get all tables
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\n✅ Database has ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));

    // Test SequelizeMeta
    const [migrations] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
    console.log(`\n✅ ${migrations.length} migrations executed:`);
    migrations.forEach(m => console.log(`   - ${m.name}`));

    console.log('\n🎉 All tests passed! Your models are ready to use.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testModels();
