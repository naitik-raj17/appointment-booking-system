/* CLI: npm run seed — wipes and repopulates the configured database with demo data. */
const { connectDB, disconnectDB } = require('../config/db');
const { seedDatabase, DEMO_PASSWORDS } = require('./seedData');

(async () => {
  const { inMemory } = await connectDB();
  if (inMemory) console.warn('[seed] Warning: seeding an in-memory database; data disappears when this process exits.');
  const summary = await seedDatabase();
  console.log('[seed] done', summary);
  console.log('[seed] demo logins:');
  console.log(`  admin     admin@bookease.com          / ${DEMO_PASSWORDS.admin}`);
  console.log(`  provider  sarah.mitchell@bookease.com / ${DEMO_PASSWORDS.provider}`);
  console.log(`  customer  alice@example.com           / ${DEMO_PASSWORDS.customer}`);
  await disconnectDB();
})().catch(async (err) => {
  console.error('[seed] failed', err);
  await disconnectDB();
  process.exit(1);
});
